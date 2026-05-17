// ────────────────────────────────────────────────────────────────────────────
// lib/aiAnalysis.ts
// Client helpers for the analyze-game Edge Function and quota status.
// ────────────────────────────────────────────────────────────────────────────

import { supabase } from "./supabase";
import { Cell } from "./gameLogic";
import { AnalysisResult } from "./aiEngine";

export interface QuotaStatus {
  subscription_status: "free" | "pro" | "expired";
  is_pro: boolean;
  analyses_today: number;
  daily_limit: number;
}

export interface AIExplanationSuccess {
  kind: "ok";
  explanation: string;
  analyses_today: number;
  reason: "pro" | "free_quota";
}

export interface AIExplanationError {
  kind: "error";
  reason: "quota_exceeded" | "auth" | "ai_unavailable" | "network" | "unknown";
  analyses_today?: number;
  message?: string;
}

export type AIExplanationResponse = AIExplanationSuccess | AIExplanationError;

// Render the board as compact ASCII for the prompt. 'w'/'b' = pawn,
// 'W'/'B' = king, '.' = empty. Rows top-to-bottom match board[0..7] so the
// prompt also explicitly notes that white is on the bottom.
function boardToAscii(board: Cell[][]): string {
  const lines: string[] = [];
  for (let r = 0; r < 8; r++) {
    let line = "";
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c].piece;
      if (!piece) {
        line += ".";
      } else if (piece.color === "white") {
        line += piece.isKing ? "W" : "w";
      } else {
        line += piece.isKing ? "B" : "b";
      }
    }
    lines.push(line);
  }
  return lines.join("\n");
}

// Convert (row,col) to a board-coordinate string like "e3".
// Columns 0..7 -> a..h, rows 0..7 -> 8..1 (row 0 is top = rank 8).
function coordToNotation(row: number, col: number): string {
  const file = String.fromCharCode("a".charCodeAt(0) + col);
  const rank = 8 - row;
  return `${file}${rank}`;
}

function describeMove(
  steps: AnalysisResult["bestMove"] extends { steps: infer S } ? S : never,
): string {
  if (!steps || steps.length === 0) return "(no move)";
  const from = coordToNotation(steps[0].from.row, steps[0].from.col);
  const to = coordToNotation(
    steps[steps.length - 1].to.row,
    steps[steps.length - 1].to.col,
  );
  const captures = steps.filter((s: any) => s.capturedAt !== null).length;
  return captures > 1
    ? `${from}→${to} (${captures}-piece chain)`
    : captures === 1
      ? `${from}×${to}`
      : `${from}-${to}`;
}

export async function getQuotaStatus(
  userId: string,
): Promise<QuotaStatus | null> {
  const { data, error } = await supabase.rpc("get_analysis_quota_status", {
    p_user_id: userId,
  });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row as QuotaStatus;
}

export async function requestAIExplanation(args: {
  board: Cell[][];
  analysis: AnalysisResult;
  actualMoveSteps: AnalysisResult["bestMove"] extends infer M
    ? M extends { steps: infer S }
      ? S
      : never
    : never;
  sideToMove: "white" | "black";
  moveNumber: number;
}): Promise<AIExplanationResponse> {
  const { board, analysis, actualMoveSteps, sideToMove, moveNumber } = args;
  if (!analysis.bestMove) {
    return { kind: "error", reason: "unknown", message: "No best move data" };
  }

  const boardAscii = boardToAscii(board);
  const actualMove = describeMove(actualMoveSteps as any);
  const bestMove = describeMove(analysis.bestMove.steps as any);

  try {
    const { data, error } = await supabase.functions.invoke("analyze-game", {
      body: {
        boardAscii,
        actualMove,
        bestMove,
        actualScore: analysis.actualScore,
        bestScore: analysis.bestScore,
        scoreLoss: analysis.scoreLoss,
        sideToMove,
        moveNumber,
      },
    });

    if (error) {
      // supabase-js wraps non-2xx into FunctionsHttpError. We have to parse
      // the response body separately to get our structured reason.
      // Try the response body if present.
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          if (body?.error === "quota_exceeded") {
            return {
              kind: "error",
              reason: "quota_exceeded",
              analyses_today: body.analyses_today,
            };
          }
          if (body?.error === "ai_unavailable") {
            return {
              kind: "error",
              reason: "ai_unavailable",
              message: body.message,
            };
          }
        } catch {
          /* fall through */
        }
      }
      return { kind: "error", reason: "network", message: String(error) };
    }

    if (!data?.explanation) {
      return { kind: "error", reason: "unknown" };
    }
    return {
      kind: "ok",
      explanation: data.explanation,
      analyses_today: data.analyses_today,
      reason: data.reason,
    };
  } catch (err) {
    return { kind: "error", reason: "network", message: String(err) };
  }
}
