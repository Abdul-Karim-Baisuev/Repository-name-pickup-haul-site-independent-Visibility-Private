// Stripe webhook — the ONLY source of truth for setting an estimate to paid.
// Verifies the Stripe signature using STRIPE_WEBHOOK_SECRET, then updates the
// matching estimate by Checkout Session ID (recorded at session creation).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const logEvent = async (row: {
    event_id?: string | null;
    event_type?: string | null;
    signature_verified: boolean;
    outcome: string;
    http_status: number;
    error_message?: string | null;
    estimate_request_id?: string | null;
    payload_summary?: Record<string, unknown> | null;
  }) => {
    try {
      await admin.from("stripe_webhook_events").insert(row as never);
    } catch (e) {
      console.error("failed to log stripe webhook event", e);
    }
  };

  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) {
    await logEvent({
      signature_verified: false,
      outcome: "missing_signature_or_secret",
      http_status: 400,
      error_message: !sig ? "stripe-signature header missing" : "STRIPE_WEBHOOK_SECRET not set",
    });
    return new Response("Missing signature/secret", { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe-webhook signature verification failed:", msg);
    await logEvent({
      signature_verified: false,
      outcome: "invalid_signature",
      http_status: 400,
      error_message: msg.slice(0, 500),
    });
    return new Response("Invalid signature", { status: 400 });
  }

  let outcome = "ignored";
  let httpStatus = 200;
  let errMsg: string | null = null;
  let matchedEstimateId: string | null = null;
  const summary: Record<string, unknown> = { type: event.type };

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;
      const linkType = (session.metadata?.link_type ?? "") as string;
      const estimateId = session.metadata?.estimate_id as string | undefined;
      const piId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      summary.session_id = sessionId;
      summary.link_type = linkType;
      summary.payment_intent_id = piId;

      if (event.type === "checkout.session.completed" && session.payment_status !== "paid") {
        outcome = "session_not_yet_paid";
      } else {
        const { data: row } = await admin
          .from("estimate_requests")
          .select("id, payment_status, deposit_amount_cents, final_price_cents, balance_due_cents")
          .or(
            `stripe_checkout_session_id.eq.${sessionId}${estimateId ? `,id.eq.${estimateId}` : ""}`,
          )
          .maybeSingle();

        if (!row) {
          outcome = "no_estimate_match";
        } else {
          matchedEstimateId = row.id;
          let nextStatus = row.payment_status;
          const update: Record<string, unknown> = {
            stripe_checkout_session_id: sessionId,
            stripe_payment_intent_id: piId,
            paid_at: new Date().toISOString(),
          };

          if (linkType === "deposit") {
            nextStatus = "deposit_paid";
            const balance = (row.final_price_cents ?? 0) - (row.deposit_amount_cents ?? 0);
            if (balance > 0) update.balance_due_cents = balance;
          } else if (linkType === "balance" || linkType === "full") {
            nextStatus = "paid";
            update.balance_due_cents = 0;
          }
          update.payment_status = nextStatus;

          const { error: updErr } = await admin
            .from("estimate_requests")
            .update(update)
            .eq("id", row.id);
          if (updErr) {
            outcome = "db_update_failed";
            httpStatus = 500;
            errMsg = updErr.message;
          } else {
            outcome = `estimate_${nextStatus}`;
          }
        }
      }
    } else if (event.type === "charge.refunded" || event.type === "checkout.session.async_payment_failed") {
      const obj = event.data.object as { id?: string; payment_intent?: string | null };
      const piId = (obj as { payment_intent?: string | null }).payment_intent ?? obj.id ?? null;
      summary.payment_intent_id = piId;
      if (piId) {
        const newStatus = event.type === "charge.refunded" ? "refunded" : "failed";
        await admin
          .from("estimate_requests")
          .update({ payment_status: newStatus })
          .eq("stripe_payment_intent_id", piId);
        outcome = `estimate_${newStatus}`;
      } else {
        outcome = "no_payment_intent";
      }
    } else if (event.type === "lovable.webhook_test") {
      outcome = "test_event_verified";
      summary.test = true;
    }
  } catch (e) {
    outcome = "handler_exception";
    httpStatus = 500;
    errMsg = e instanceof Error ? e.message : String(e);
    console.error("stripe-webhook handler error:", e);
  }

  await logEvent({
    event_id: event.id,
    event_type: event.type,
    signature_verified: true,
    outcome,
    http_status: httpStatus,
    error_message: errMsg,
    estimate_request_id: matchedEstimateId,
    payload_summary: summary,
  });

  return new Response(httpStatus === 200 ? "ok" : "error", { status: httpStatus });
});
