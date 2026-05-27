// Mapbox Geocoding proxy — keeps the access token on the server.
// Restricted to California, Arizona and Nevada (US). v2 shared rate limit.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { checkRateLimit, getClientIp } from "../_shared/mapbox-rate-limit.ts";

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  context?: { id: string; text: string; short_code?: string }[];
}

interface MapboxResponse {
  features?: MapboxFeature[];
}

const ALLOWED_REGIONS = new Set(["US-CA", "US-AZ", "US-NV"]);

// Shared DB-backed sliding window across all isolates.
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SECONDS = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("mapbox-geocode invoked v2");
  const ip = getClientIp(req);
  const allowed = await checkRateLimit(
    "geocode",
    ip,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  console.log("mapbox-geocode allowed=", allowed);
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
    const query = (url.searchParams.get("q") ?? "").trim();

    if (query.length < 3) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (query.length > 160) {
      return new Response(JSON.stringify({ error: "Query too long" }), {
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

    const endpoint = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
    );
    endpoint.searchParams.set("access_token", token);
    endpoint.searchParams.set("autocomplete", "true");
    endpoint.searchParams.set("country", "US");
    endpoint.searchParams.set("limit", "6");
    endpoint.searchParams.set("types", "address,place,postcode,locality,neighborhood,poi");
    // Bias toward Southern California
    endpoint.searchParams.set("proximity", "-118.2437,34.0522");

    const upstream = await fetch(endpoint.toString());
    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("Mapbox upstream error", upstream.status, text);
      return new Response(JSON.stringify({ error: "Geocoding failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = (await upstream.json()) as MapboxResponse;

    const suggestions = (data.features ?? [])
      .filter((feature) => {
        const region = feature.context?.find((c) => c.id.startsWith("region"));
        return region?.short_code ? ALLOWED_REGIONS.has(region.short_code) : false;
      })
      .map((feature) => ({
        id: feature.id,
        label: feature.place_name,
        primary: feature.text,
        center: feature.center,
      }));

    return new Response(JSON.stringify({ suggestions }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error: unknown) {
    console.error("mapbox-geocode error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
