// ────────────────────────────────────────────────────────────────────────────
// Edge Function: analyze-game
//
// Auth: requires a Supabase user JWT (sent automatically by supabase-js
// when invoking via supabase.functions.invoke from an authenticated client).
//
// Flow:
//   1. Verify JWT, extract user_id.
//   2. Call consume_analysis_quota RPC — atomic check + decrement.
//   3. If allowed: call Groq (Llama 3.3 70B) with the position and moves,
//      return its natural-language explanation.
//   4. If denied: return 429 with reason so client can show upgrade UI.
//
// Why Groq instead of Gemini:
//   - Gemini's free tier is unavailable in some countries (e.g. KZ).
//   - Groq's free tier works globally, no billing card required, and offers
//     Llama 3.3 70B with quality comparable to Gemini Flash.
//
// Secrets required (set via `supabase secrets set`):
//   GROQ_API_KEY              - from console.groq.com (starts with "gsk_")
//   SUPABASE_URL              - auto-provided by Supabase runtime
//   SUPABASE_ANON_KEY         - auto-provided
//   SUPABASE_SERVICE_ROLE_KEY - auto-provided; needed for SECURITY DEFINER RPC
// ────────────────────────────────────────────────────────────────────────────

// @ts-ignore - Deno-specific import; the Supabase runtime resolves this URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

interface AnalyzeRequestBody {
  // Compact 8x8 ASCII representation of the board (one line per row).
  // The frontend builds this from Cell[][] before sending — keeps the prompt
  // small without losing positional info.
  boardAscii: string;
  // Coordinates as chess-style notation, e.g. "e3-d4" or "c3×d4".
  actualMove: string;
  bestMove: string;
  // Eval numbers from the local engine — give the model a sense of magnitude.
  actualScore: number;
  bestScore: number;
  scoreLoss: number;
  // Whose move it was: "white" or "black".
  sideToMove: string;
  // 1-indexed move number in the game.
  moveNumber: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// System prompt — kept terse. Defines persona and constraints in 3 lines.
// The user prompt below carries the variable data.
const SYSTEM_PROMPT =
  "You are a friendly checkers coach. You explain a single move to a learning player in 2-3 sentences of plain English. Be specific about the position when possible. Use chess-style coordinates like e3 when referring to squares. Don't quote the numeric evaluations verbatim. If the player's move was the best move, praise it briefly and say why. Respond with just the explanation — no preamble, no headers, no markdown.";

function buildUserPrompt(b: AnalyzeRequestBody): string {
  return `The player played: ${b.actualMove} (eval: ${b.actualScore.toFixed(1)})
The engine prefers: ${b.bestMove} (eval: ${b.bestScore.toFixed(1)})
Side to move: ${b.sideToMove}
Move number: ${b.moveNumber}
Score loss for playing the actual move: ${b.scoreLoss.toFixed(1)}

Board (8x8, '.'=empty, 'w'/'b'=pawn, 'W'/'B'=king, white on bottom):
${b.boardAscii}

Explain why the engine's move is better, or why the player's move was good.`;
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  // Groq uses an OpenAI-compatible chat-completions API. Documented at
  // https://console.groq.com/docs/api-reference#chat-create.
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Llama 3.3 70B — strongest free-tier model on Groq as of late 2025.
      // If Groq deprecates this id, swap to "llama-3.1-70b-versatile" or
      // check the current model list at https://console.groq.com/docs/models.
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 250,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("Groq returned empty response");
  }
  return text.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing auth" }, 401);
    }

    // Two clients on different keys, by design:
    //   - `authClient` uses the user's JWT — auth.getUser() resolves who they are.
    //   - `serviceClient` uses the service role — bypasses RLS to call the
    //     SECURITY DEFINER RPC without permission gymnastics.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Invalid auth" }, 401);
    }
    const userId = userData.user.id;

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Atomic quota check + decrement.
    const { data: quotaData, error: quotaErr } = await serviceClient.rpc(
      "consume_analysis_quota",
      { p_user_id: userId },
    );
    if (quotaErr) {
      console.error("RPC error:", quotaErr);
      return jsonResponse({ error: "Quota check failed" }, 500);
    }
    const quota = Array.isArray(quotaData) ? quotaData[0] : quotaData;
    if (!quota?.allowed) {
      return jsonResponse(
        {
          error: "quota_exceeded",
          reason: quota?.reason ?? "limit_reached",
          analyses_today: quota?.analyses_today ?? 1,
        },
        429,
      );
    }

    const body = (await req.json()) as AnalyzeRequestBody;

    // Sanity check the input.
    if (
      typeof body.actualMove !== "string" ||
      typeof body.bestMove !== "string" ||
      typeof body.boardAscii !== "string"
    ) {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    const userPrompt = buildUserPrompt(body);
    let explanation: string;
    try {
      explanation = await callGroq(SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      console.error("Groq call failed:", err);
      // Quota has been consumed at this point. Refunding it atomically is
      // tricky; safer to surface the error and let the user retry tomorrow.
      // If this becomes a pattern, we can add a refund_analysis_quota RPC.
      return jsonResponse(
        { error: "ai_unavailable", message: String(err) },
        502,
      );
    }

    return jsonResponse({
      explanation,
      analyses_today: quota.analyses_today,
      reason: quota.reason,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return jsonResponse({ error: "internal_error", message: String(err) }, 500);
  }
});
