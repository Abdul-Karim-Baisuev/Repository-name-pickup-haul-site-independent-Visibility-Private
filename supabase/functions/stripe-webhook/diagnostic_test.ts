// Admin diagnostic: posts a synthetic Stripe event signed with STRIPE_WEBHOOK_SECRET
// to the deployed stripe-webhook endpoint, then asserts the response.
// Run mode is selected via TEST_MODE env (valid|invalid). Default: valid.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const hmacSha256Hex = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const runOnce = async (mode: "valid" | "invalid") => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
  if (!secret || !supabaseUrl) {
    console.log("SKIP — missing STRIPE_WEBHOOK_SECRET or SUPABASE_URL in env");
    return;
  }

  const eventId = `evt_lovable_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    type: "lovable.webhook_test",
    livemode: false,
    data: { object: { id: eventId, object: "lovable_test", note: "diagnostic" } },
  });
  const ts = Math.floor(Date.now() / 1000).toString();
  const real = await hmacSha256Hex(secret, `${ts}.${payload}`);
  const sig = mode === "invalid" ? "0".repeat(64) : real;

  const url = `${supabaseUrl}/functions/v1/stripe-webhook`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": `t=${ts},v1=${sig}` },
    body: payload,
  });
  const body = await res.text();
  console.log(`[${mode}] status=${res.status} event_id=${eventId} body=${body.slice(0, 200)}`);
  if (mode === "valid") assert(res.ok, `Expected 2xx, got ${res.status}: ${body}`);
  else assert(res.status === 400, `Expected 400, got ${res.status}: ${body}`);
};

Deno.test("stripe-webhook accepts signed payload", async () => {
  await runOnce("valid");
});

Deno.test("stripe-webhook rejects forged signature", async () => {
  await runOnce("invalid");
});
