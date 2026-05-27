// Admin-only: validate the configured MAPBOX_ACCESS_TOKEN by hitting the two
// Mapbox endpoints we actually use (geocoding + directions) and returning a
// machine-readable status. URL allowlist restrictions can't be introspected
// via the public Mapbox API, so we surface them as a checklist instead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type CheckResult = {
  ok: boolean;
  status: number;
  error?: string;
};

async function probe(url: string): Promise<CheckResult> {
  try {
    const r = await fetch(url, { method: "GET" });
    if (r.ok) return { ok: true, status: r.status };
    let err = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      if (j?.message) err = String(j.message);
    } catch {
      /* ignore */
    }
    return { ok: false, status: r.status, error: err };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "network error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase env not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({
          configured: false,
          token_prefix: null,
          token_kind: null,
          checks: {},
          summary: "MAPBOX_ACCESS_TOKEN is not configured",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokenKind = token.startsWith("sk.")
      ? "secret"
      : token.startsWith("pk.")
        ? "public"
        : "unknown";
    const tokenPrefix = token.slice(0, 8) + "…" + token.slice(-4);

    // Probe 1: geocoding (used by mapbox-geocode + autocomplete)
    const geocodeUrl =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?limit=1&access_token=${encodeURIComponent(token)}`;
    // Probe 2: directions (used by mapbox-route)
    const directionsUrl =
      `https://api.mapbox.com/directions/v5/mapbox/driving/-118.2437,34.0522;-117.1611,32.7157?geometries=geojson&overview=simplified&access_token=${encodeURIComponent(token)}`;

    const [geocode, directions] = await Promise.all([
      probe(geocodeUrl),
      probe(directionsUrl),
    ]);

    const allOk = geocode.ok && directions.ok;

    return new Response(
      JSON.stringify({
        configured: true,
        token_prefix: tokenPrefix,
        token_kind: tokenKind,
        is_public_token: tokenKind === "public",
        checks: {
          geocoding: geocode,
          directions,
        },
        summary: allOk
          ? "Token is valid and both Geocoding & Directions APIs are reachable."
          : "One or more Mapbox endpoints rejected the token. See per-check error.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("mapbox-token-status error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
