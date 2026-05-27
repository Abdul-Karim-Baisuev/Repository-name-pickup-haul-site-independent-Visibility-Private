import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const trimmed = v.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId: string | undefined = body?.session_id;
    const confirm: boolean = body?.confirm === true;
    const providedToken: string = String(body?.payment_token ?? body?.t ?? "").trim();

    if (!sessionId || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return json({ error: "Invalid session_id" }, 400);
    }
    if (!providedToken || providedToken.length < 16 || providedToken.length > 128) {
      return json({ error: "Missing or invalid payment_token" }, 401);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Read existing metadata first (we need it for both auth and merging)
    const existing = await stripe.checkout.sessions.retrieve(sessionId);
    const meta = { ...(existing.metadata ?? {}) };

    // ---- Server-side authorization ----
    // Accept payment_token if it matches EITHER:
    //  (a) the estimate row tied to this Stripe session (canonical estimate flow), OR
    //  (b) metadata.session_secret minted at session creation (ad-hoc flows).
    let isAuthorized = false;
    const metaSecret = String(meta.session_secret ?? "").trim();
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
    if (!isAuthorized) {
      return json({ error: "Forbidden" }, 403);
    }
    // ---- End authorization ----

    const pickup_address = clean(body?.pickup_address, 250);
    const dropoff_address = clean(body?.dropoff_address, 250);
    const delivery_date = clean(body?.delivery_date, 40);
    const delivery_time = clean(body?.delivery_time, 60);

    if (meta.route_confirmed_at) {
      // Once confirmed, no further changes — but don't echo session_secret back
      const safeMeta = { ...meta };
      delete safeMeta.session_secret;
      return json({ error: "Route is already confirmed and locked.", metadata: safeMeta }, 409);
    }

    if (confirm) {
      const finalPickup = pickup_address ?? meta.pickup_address ?? null;
      const finalDropoff = dropoff_address ?? meta.dropoff_address ?? null;
      const finalDate = delivery_date ?? meta.delivery_date ?? null;
      const finalTime = delivery_time ?? meta.delivery_time ?? null;

      if (!finalPickup || !finalDropoff || !finalDate || !finalTime) {
        return json({ error: "All delivery fields must be set before confirming." }, 400);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
        return json({ error: "Invalid date format" }, 400);
      }

      meta.pickup_address = finalPickup;
      meta.dropoff_address = finalDropoff;
      meta.delivery_date = finalDate;
      meta.delivery_time = finalTime;
      meta.route_confirmed_at = new Date().toISOString();
    } else {
      if (!pickup_address || !dropoff_address || !delivery_date || !delivery_time) {
        return json({ error: "All fields are required" }, 400);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(delivery_date)) {
        return json({ error: "Invalid date format" }, 400);
      }
      const parsed = new Date(delivery_date + "T00:00:00");
      if (isNaN(parsed.getTime())) return json({ error: "Invalid date" }, 400);

      meta.pickup_address = pickup_address;
      meta.dropoff_address = dropoff_address;
      meta.delivery_date = delivery_date;
      meta.delivery_time = delivery_time;
      meta.delivery_details_submitted_at = new Date().toISOString();
    }

    const updated = await stripe.checkout.sessions.update(sessionId, { metadata: meta });

    const safeOut = { ...(updated.metadata ?? {}) };
    delete safeOut.session_secret;
    return json({ ok: true, metadata: safeOut });
  } catch (error) {
    console.error("update-checkout-session-details error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
