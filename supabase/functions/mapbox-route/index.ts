// Mapbox Directions proxy — returns route geometry + duration + distance.
// Inputs: from=lng,lat & to=lng,lat
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { checkRateLimit, getClientIp } from "../_shared/mapbox-rate-limit.ts";

const COORD = /^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/;

// Shared DB-backed sliding window — stricter than geocode (route is more expensive).
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(
    "route",
    ip,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Too many map requests. Please try again later." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }

  try {
    const url = new URL(req.url);
    const from = (url.searchParams.get("from") ?? "").trim();
    const to = (url.searchParams.get("to") ?? "").trim();

    if (!COORD.test(from) || !COORD.test(to)) {
      return new Response(JSON.stringify({ error: "Invalid coordinates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "Mapbox token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint =
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
      `${encodeURIComponent(from)};${encodeURIComponent(to)}` +
      `?geometries=geojson&overview=full&access_token=${token}`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Mapbox request failed", status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) {
      return new Response(JSON.stringify({ error: "No route found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        duration_seconds: route.duration,
        distance_meters: route.distance,
        geometry: route.geometry,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30",
        },
      },
    );
  } catch (err) {
    console.error("mapbox-route error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
