// Admin-only: posts a synthetic Stripe event to the stripe-webhook endpoint,
// signed with STRIPE_WEBHOOK_SECRET. Lets admin verify the signature flow
// end-to-end without going to Stripe Dashboard. Real funds never move.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const hmacSha256Hex = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Authenticate caller and require admin role.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
  if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: claims.claims.sub,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const mode: "valid" | "invalid" = body?.mode === "invalid" ? "invalid" : "valid";

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!webhookSecret || !supabaseUrl) return json({ error: "Missing config" }, 500);

  const eventId = `evt_lovable_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const eventPayload = {
    id: eventId,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    type: "lovable.webhook_test",
    livemode: false,
    data: {
      object: {
        id: eventId,
        object: "lovable_test",
        triggered_by: claims.claims.sub,
        note: "Synthetic event from admin panel — no payment processed.",
      },
    },
  };
  const payloadStr = JSON.stringify(eventPayload);

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${timestamp}.${payloadStr}`;
  const realSig = await hmacSha256Hex(webhookSecret, signedPayload);
  const sigToSend = mode === "invalid" ? "0".repeat(64) : realSig;
  const signatureHeader = `t=${timestamp},v1=${sigToSend}`;

  const url = `${supabaseUrl}/functions/v1/stripe-webhook`;
  const start = Date.now();
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signatureHeader,
      },
      body: payloadStr,
    });
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : String(e), event_id: eventId, mode },
      500,
    );
  }
  const respText = await resp.text();
  const durationMs = Date.now() - start;

  return json({
    ok: mode === "invalid" ? resp.status === 400 : resp.ok,
    mode,
    event_id: eventId,
    http_status: resp.status,
    response_body: respText.slice(0, 200),
    duration_ms: durationMs,
    expected: mode === "invalid" ? "400 Invalid signature" : "200 ok",
  });
});
