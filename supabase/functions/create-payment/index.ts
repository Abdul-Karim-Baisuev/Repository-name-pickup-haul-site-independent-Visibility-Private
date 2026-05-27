import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Whitelist of allowed Stripe price IDs (fixed packages).
// Keep this in sync with src/data/servicePackages.ts on the frontend.
const ALLOWED_PRICE_IDS = new Set<string>([
  "price_1TRytjDapJqiWEujlwNhnCtw", // Small Move – $249
  "price_1TRyuUDapJqiWEujpOLJnQRP", // Furniture Pickup & Delivery – $179
  "price_1TRyurDapJqiWEujedg3VnCv", // Junk Removal – $299
  "price_1TRyvGDapJqiWEujbYNyfr1G", // Construction Haul – $349
  "price_1TRyw7DapJqiWEuj6MzvSNVP", // IKEA Bed/Wardrobe Assembly – $149
  "price_1TRywVDapJqiWEujL5bDWTWr", // TV Wall Mount – $129
  "price_1TRywvDapJqiWEujacZgDA2c", // Office Desk + Chair Setup – $99
  "price_1TRyxGDapJqiWEuj2iWCY98P", // Full Apartment Setup – $399
]);

// (Custom-amount payments removed — go through create-estimate-payment.)

// Durable per-IP rate limit backed by the public.mapbox_rate_hits table
// (reused via the existing check_mapbox_rate_limit RPC). Counters survive
// edge cold starts and are consistent across isolates.
//   - 5 attempts per 10 minutes (burst)
//   - 20 attempts per hour     (sustained)
// Raw IPs are never stored — only a SHA-256 hash with a per-scope salt.
const RL_BURST_MAX = 5;
const RL_BURST_WINDOW_SEC = 10 * 60;
const RL_HOURLY_MAX = 20;
const RL_HOURLY_WINDOW_SEC = 60 * 60;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const adminDb =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  return (
    first ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkBucket(
  scope: string,
  ip: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  if (!adminDb) return true; // fail-open if env missing
  try {
    const ipHash = await sha256Hex(`${scope}:${ip}`);
    const { data, error } = await adminDb.rpc("check_mapbox_rate_limit", {
      _scope: scope,
      _ip_hash: ipHash,
      _max: max,
      _window_seconds: windowSec,
    });
    if (error) {
      console.error("create-payment rate-limit rpc error", JSON.stringify(error));
      return true; // fail-open on transient DB errors
    }
    return data === true;
  } catch (e) {
    console.error("create-payment rate-limit exception", (e as Error).message);
    return true;
  }
}

async function isRateLimited(ip: string): Promise<boolean> {
  const burstOk = await checkBucket(
    "checkout_burst",
    ip,
    RL_BURST_MAX,
    RL_BURST_WINDOW_SEC,
  );
  if (!burstOk) return true;
  const hourlyOk = await checkBucket(
    "checkout_hourly",
    ip,
    RL_HOURLY_MAX,
    RL_HOURLY_WINDOW_SEC,
  );
  return !hourlyOk;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  if (await isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many payment attempts. Please try again later." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "600",
        },
      },
    );
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode as "package" | "custom" | undefined;
    const customerEmail =
      typeof body?.customerEmail === "string" && body.customerEmail.length <= 254
        ? body.customerEmail
        : undefined;
    const origin = req.headers.get("origin") ?? "https://www.autobais.app";

    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (mode === "package") {
      const priceId = body?.priceId;
      if (typeof priceId !== "string" || !ALLOWED_PRICE_IDS.has(priceId)) {
        return new Response(
          JSON.stringify({ error: "Invalid or unknown package" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Optional add-ons (validated server-side: max 6, each $20-$300)
      const rawAddOns = Array.isArray(body?.addOns) ? body.addOns : [];
      const addOnLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      const addOnLabels: string[] = [];
      for (const a of rawAddOns.slice(0, 6)) {
        const label = typeof a?.label === "string" ? a.label.trim().slice(0, 80) : "";
        const price = Number(a?.price);
        if (!label || !Number.isFinite(price) || price < 20 || price > 300) continue;
        addOnLineItems.push({
          price_data: {
            currency: "usd",
            unit_amount: Math.round(price * 100),
            product_data: { name: `Add-on: ${label}` },
          },
          quantity: 1,
        });
        addOnLabels.push(label);
      }

      const sessionSecret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      sessionParams = {
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }, ...addOnLineItems],
        success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&t=${sessionSecret}`,
        cancel_url: `${origin}/payment-canceled`,
        customer_email: customerEmail,
        phone_number_collection: { enabled: true },
        allow_promotion_codes: true,
        metadata: {
          source: "service_package",
          price_id: priceId,
          add_ons: addOnLabels.join(", "),
          session_secret: sessionSecret,
        },
      };
    } else if (mode === "custom") {
      // Public callers may NOT create arbitrary checkout sessions by
      // sending an amountCents value from the browser. Custom-amount
      // payments are tied to a verified DB record (estimate_requests)
      // and must go through `create-estimate-payment` with a
      // payment_token; the server reads the amount from the row.
      return new Response(
        JSON.stringify({
          error:
            "Custom payments are not available here. Please use the secure payment link sent to you, or sign in to your portal.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Missing or invalid mode (expected 'package')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("create-payment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
