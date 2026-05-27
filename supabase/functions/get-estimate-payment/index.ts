// Public, read-only lookup of payment info for a given payment_token.
// Customers see only the fields they need to decide and pay; never any
// admin notes or other PII beyond what's required.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    if (token.length < 20 || token.length > 80) return json({ error: "Invalid token" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data, error } = await admin
      .from("estimate_requests")
      .select(
        "public_code, service_type, address, payment_status, final_price_cents, deposit_amount_cents, balance_due_cents, last_payment_link_type",
      )
      .eq("payment_token", token)
      .maybeSingle();

    if (error) {
      console.error("get-estimate-payment lookup", error);
      return json({ error: "Lookup failed" }, 500);
    }
    if (!data) return json({ error: "Not found" }, 404);
    if (!data.final_price_cents || data.final_price_cents <= 0) {
      return json({ error: "Awaiting confirmation by our team." }, 409);
    }

    return json(data);
  } catch (e) {
    console.error("get-estimate-payment", e);
    return json({ error: "Internal error" }, 500);
  }
});
