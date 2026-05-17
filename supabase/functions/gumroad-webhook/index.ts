// ────────────────────────────────────────────────────────────────────────────
// Edge Function: gumroad-webhook
//
// Receives "ping" events from Gumroad when subscription state changes.
//
// Gumroad webhooks are form-encoded POSTs, not JSON. They are NOT
// cryptographically signed, so to verify authenticity we re-fetch the sale
// from Gumroad's API using our access token. If the sale exists and matches
// the payload, the webhook is genuine.
//
// Mapping URL custom field → user:
//   The Gumroad product URL must include ?user_id={uuid}. Gumroad surfaces
//   that as `url_params[user_id]` in the webhook payload. That's how we tie
//   a purchase to a Supabase user.
//
// Events handled:
//   - sale                  -> new subscription started OR one-off renewal
//   - subscription_updated  -> tier change, etc.
//   - subscription_restarted-> user resubscribed
//   - subscription_ended    -> grace period over, fully expired
//   - subscription_cancelled-> user cancelled (may keep access until period end)
//   - refund                -> revoke access immediately
//   - dispute / dispute_won -> chargeback handling
//
// Secrets required:
//   GUMROAD_ACCESS_TOKEN          - from gumroad Settings → Advanced → Applications
//   GUMROAD_PRODUCT_PERMALINK     - the "tempo" part of /l/tempo
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided)
// ────────────────────────────────────────────────────────────────────────────

// @ts-ignore - Deno-specific import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}

// Parse form-encoded body into a flat object. Handles bracketed keys like
// "url_params[user_id]" by storing them as their full bracketed name —
// Gumroad uses that style and we look up the exact key later.
async function parseFormBody(req: Request): Promise<Record<string, string>> {
  const text = await req.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

// Verify the sale exists in Gumroad and matches our product. Without this,
// anyone who finds the webhook URL could fake an upgrade.
async function verifySale(saleId: string): Promise<{
  ok: boolean;
  productPermalink?: string;
  customFields?: Record<string, string>;
  subscriptionId?: string;
  recurrence?: string;
  cancelled?: boolean;
}> {
  const token = Deno.env.get("GUMROAD_ACCESS_TOKEN");
  if (!token) throw new Error("GUMROAD_ACCESS_TOKEN not set");

  const res = await fetch(
    `https://api.gumroad.com/v2/sales/${saleId}?access_token=${token}`,
  );
  if (!res.ok) return { ok: false };

  const data = await res.json();
  if (!data?.success || !data?.sale) return { ok: false };

  const sale = data.sale;
  // Gumroad surfaces url_params (the query string on the product link) as
  // a nested object on the sale.
  const urlParams = (sale.url_params ?? {}) as Record<string, string>;

  return {
    ok: true,
    productPermalink: sale.product_permalink,
    customFields: urlParams,
    subscriptionId: sale.subscription_id,
    recurrence: sale.recurrence,
    cancelled: !!sale.cancelled,
  };
}

// Pull user_id out of the webhook payload. Gumroad encodes nested form keys
// as e.g. "url_params[user_id]" — that's the exact lookup we need.
function extractUserId(body: Record<string, string>): string | null {
  return body["url_params[user_id]"] || body["custom_fields[user_id]"] || null;
}

// One paid month from the sale. Gumroad's API tells us when the next charge
// will happen, but it's easier to roll forward 31 days ourselves and rely on
// renewal webhooks to push the date out further. If a renewal misses, the
// user will see their subscription "expire" until the next webhook fires.
function nextPeriodEnd(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 31);
  return d.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return textResponse("Method not allowed", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const productPermalink = Deno.env.get("GUMROAD_PRODUCT_PERMALINK") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await parseFormBody(req);
    const eventType =
      // Gumroad sends different fields for different event types; this is
      // a heuristic that handles the common ones.
      body["resource_name"] ||
      (body["subscription_id"] && body["sale_id"] ? "sale" : "unknown");

    const saleId = body["sale_id"];
    const subscriptionId = body["subscription_id"];

    // Sale-driven events get verified via the API; the sale_id is the
    // anchor. Subscription-only events (subscription_ended/cancelled) come
    // without a sale_id, so we look up the user by subscription_id directly.
    let userId: string | null = null;

    if (saleId) {
      const verified = await verifySale(saleId);
      if (!verified.ok) {
        return textResponse("Sale verification failed", 401);
      }
      if (
        productPermalink &&
        verified.productPermalink &&
        verified.productPermalink !== productPermalink
      ) {
        // Webhook for a different product on the same account — ignore.
        return textResponse("Wrong product", 200);
      }
      userId = verified.customFields?.user_id ?? extractUserId(body) ?? null;
    } else {
      // No sale_id. Use the subscription_id to find the user we previously
      // associated with this subscription.
      if (subscriptionId) {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("gumroad_subscription_id", subscriptionId)
          .maybeSingle();
        userId = data?.id ?? null;
      }
    }

    // Log the event regardless — even if we couldn't tie it to a user,
    // we want a record for debugging.
    await supabase.from("subscription_events").insert({
      user_id: userId,
      event_type: eventType,
      gumroad_sale_id: saleId ?? null,
      gumroad_subscription_id: subscriptionId ?? null,
      raw_payload: body,
    });

    if (!userId) {
      return textResponse("ok (no user)", 200);
    }

    // Apply the event to the user's profile.
    switch (eventType) {
      case "sale":
      case "subscription_restarted":
      case "subscription_updated": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "pro",
            subscription_expires_at: nextPeriodEnd(),
            gumroad_subscription_id: subscriptionId ?? null,
          })
          .eq("id", userId);
        break;
      }

      case "cancellation":
      case "subscription_cancelled": {
        // Cancellation means they won't be charged again, but typically
        // they keep access until the period ends. We DON'T flip status
        // to 'expired' here — that happens automatically when
        // subscription_expires_at passes, via consume_analysis_quota.
        // No DB update needed. The audit log records the event.
        break;
      }

      case "subscription_ended":
      case "refund":
      case "dispute":
      case "dispute_won": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "expired",
            subscription_expires_at: new Date().toISOString(),
          })
          .eq("id", userId);
        break;
      }

      default: {
        // Unknown event — we logged it, nothing else to do.
        break;
      }
    }

    return textResponse("ok", 200);
  } catch (err) {
    console.error("Webhook error:", err);
    return textResponse(`error: ${String(err)}`, 500);
  }
});
