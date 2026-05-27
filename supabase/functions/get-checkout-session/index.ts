import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Constant-time string compare
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    const providedToken = (url.searchParams.get("payment_token") ?? url.searchParams.get("t") ?? "").trim();

    if (!sessionId || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return new Response(
        JSON.stringify({ error: "Invalid session_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "line_items.data.price.product"],
    });

    // ---- Authorization gate for PII fields ----
    // Returns email/name/phone only when caller proves possession of a
    // payment_token that matches either:
    //  (a) the estimate row tied to this Stripe session (estimate-flow), OR
    //  (b) metadata.session_secret stored at session creation (ad-hoc flow).
    // Without a valid token the response strips all PII.
    let isAuthorized = false;
    if (providedToken && providedToken.length >= 16 && providedToken.length <= 128) {
      const metaSecret = (session.metadata?.session_secret ?? "").trim();
      if (metaSecret && safeEq(metaSecret, providedToken)) {
        isAuthorized = true;
      } else {
        const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        if (supaUrl && supaKey) {
          const admin = createClient(supaUrl, supaKey, { auth: { persistSession: false } });
          const { data: row } = await admin
            .from("estimate_requests")
            .select("payment_token")
            .eq("stripe_checkout_session_id", sessionId)
            .maybeSingle();
          if (row?.payment_token && safeEq(String(row.payment_token), providedToken)) {
            isAuthorized = true;
          }
        }
      }
    }

    const lineItems = (session.line_items?.data ?? []).map((li) => {
      const product = li.price?.product;
      const productName =
        product && typeof product !== "string" && !("deleted" in product && product.deleted)
          ? product.name
          : li.description ?? "Item";
      return {
        name: productName,
        description: li.description ?? null,
        quantity: li.quantity ?? 1,
        amount_total: li.amount_total ?? 0,
        amount_subtotal: li.amount_subtotal ?? 0,
      };
    });

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    // Strip internal-only fields from metadata returned to public callers
    const safeMetadata: Record<string, string> = { ...(session.metadata ?? {}) };
    delete safeMetadata.session_secret;
    if (!isAuthorized) {
      // Drop fields that could indirectly leak PII or internal ids
      delete safeMetadata.estimate_id;
    }

    return new Response(
      JSON.stringify({
        id: session.id,
        payment_intent: isAuthorized ? paymentIntentId : null,
        created: session.created ?? null,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total ?? 0,
        amount_subtotal: session.amount_subtotal ?? 0,
        total_discount: (session.total_details?.amount_discount ?? 0),
        currency: (session.currency ?? "usd").toUpperCase(),
        // PII gated behind valid payment_token; null otherwise
        customer_email: isAuthorized
          ? (session.customer_details?.email ?? session.customer_email ?? null)
          : null,
        customer_name: isAuthorized ? (session.customer_details?.name ?? null) : null,
        customer_phone: isAuthorized ? (session.customer_details?.phone ?? null) : null,
        metadata: safeMetadata,
        line_items: lineItems,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("get-checkout-session error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
