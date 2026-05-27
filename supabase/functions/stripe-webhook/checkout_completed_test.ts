// E2E: send a real-shape signed checkout.session.completed event to the
// deployed stripe-webhook and assert the matching estimate becomes paid.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SESSION_ID = "cs_test_lovable_1baf2faa32a7465a82b25c30676c70e7";
const ESTIMATE_ID = "b6fe677e-7cbd-404b-ab14-b88abce56b8d";

const hmacHex = async (secret: string, payload: string) => {
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

Deno.test("webhook marks estimate paid on checkout.session.completed", async () => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
  assert(secret && supabaseUrl && SESSION_ID && ESTIMATE_ID, "env missing");

  const eventId = `evt_test_cscompleted_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const piId = `pi_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const event = {
    id: eventId,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: SESSION_ID,
        object: "checkout.session",
        payment_status: "paid",
        status: "complete",
        mode: "payment",
        amount_total: 25000,
        currency: "usd",
        customer_email: "support@autobais.app",
        payment_intent: piId,
        metadata: { estimate_id: ESTIMATE_ID, link_type: "full" },
      },
    },
  };
  const payload = JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = await hmacHex(secret, `${ts}.${payload}`);

  const res = await fetch(`${supabaseUrl}/functions/v1/stripe-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": `t=${ts},v1=${sig}` },
    body: payload,
  });
  const body = await res.text();
  console.log(`status=${res.status} event_id=${eventId} pi=${piId} body=${body}`);
  assertEquals(res.status, 200);
});
