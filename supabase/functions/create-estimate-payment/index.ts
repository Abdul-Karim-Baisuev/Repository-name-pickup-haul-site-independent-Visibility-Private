// Create a Stripe Checkout Session for an admin-confirmed estimate.
// SECURITY: the payable amount is read from the DB (admin-entered),
// never from the request body or query string. The caller only proves
// they hold the secret payment_token tied to this estimate.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type LinkType = "deposit" | "full" | "balance";

const MIN_CENTS = 100; // $1
const MAX_CENTS = 5_000_000; // $50,000

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token: string = body?.token ?? "";
    const linkType: LinkType = body?.linkType;

    if (token.length < 20 || token.length > 80) return json({ error: "Invalid token" }, 400);
    if (!["deposit", "full", "balance"].includes(linkType)) {
      return json({ error: "Invalid linkType" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: row, error: lookupErr } = await admin
      .from("estimate_requests")
      .select(
        "id, public_code, email, service_type, payment_status, final_price_cents, deposit_amount_cents, balance_due_cents",
      )
      .eq("payment_token", token)
      .maybeSingle();

    if (lookupErr) {
      console.error("create-estimate-payment lookup", lookupErr);
      return json({ error: "Lookup failed" }, 500);
    }
    if (!row) return json({ error: "Not found" }, 404);
    if (row.payment_status === "paid") {
      return json({ error: "This estimate is already fully paid." }, 409);
    }

    // Resolve the amount strictly from DB.
    let amount: number | null = null;
    let label = "";
    if (linkType === "deposit") {
      amount = row.deposit_amount_cents;
      label = `Deposit · ${row.service_type} · ${row.public_code}`;
    } else if (linkType === "full") {
      amount = row.final_price_cents;
      label = `Full payment · ${row.service_type} · ${row.public_code}`;
    } else {
      amount = row.balance_due_cents;
      label = `Final balance · ${row.service_type} · ${row.public_code}`;
    }

    if (!amount || amount < MIN_CENTS || amount > MAX_CENTS) {
      return json(
        { error: "Amount not configured by admin for this option." },
        409,
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") ?? "https://www.autobais.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: label,
              description:
                linkType === "deposit"
                  ? "Deposit to lock your slot. Balance due on completion."
                  : linkType === "balance"
                    ? "Final balance for completed service."
                    : "Full payment for confirmed estimate.",
            },
          },
        },
      ],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&t=${encodeURIComponent(token)}`,
      cancel_url: `${origin}/pay/${token}`,
      customer_email: row.email ?? undefined,
      phone_number_collection: { enabled: true },
      allow_promotion_codes: false,
      metadata: {
        source: "estimate_admin_link",
        estimate_id: row.id,
        public_code: row.public_code,
        link_type: linkType,
        amount_cents: String(amount),
        // Mirror the payment_token here so update/get-checkout-session can
        // verify the caller without an extra DB roundtrip in the common path.
        session_secret: token,
      },
      payment_intent_data: {
        metadata: {
          estimate_id: row.id,
          public_code: row.public_code,
          link_type: linkType,
        },
      },
    });

    // Record the session id so the webhook can match it back; do NOT change
    // payment_status here — only the webhook flips that to a paid state.
    const newStatus =
      linkType === "deposit"
        ? "deposit_pending"
        : linkType === "balance"
          ? "balance_pending"
          : "full_pending";

    await admin
      .from("estimate_requests")
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: row.payment_status === "paid" ? row.payment_status : newStatus,
      })
      .eq("id", row.id);

    return json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("create-estimate-payment", e);
    return json({ error: "Internal error" }, 500);
  }
});
