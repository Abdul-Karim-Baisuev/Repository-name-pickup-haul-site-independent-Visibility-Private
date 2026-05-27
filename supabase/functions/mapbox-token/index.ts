// Returns the PUBLIC Mapbox token (pk.*) for browser-side map rendering.
// This endpoint MUST never expose the server-side secret token (sk.*).
// MAPBOX_PUBLIC_TOKEN should be a URL-restricted pk.* token from Mapbox.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Public Mapbox token not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Hard guard: refuse to return anything that isn't a public pk.* token.
  // This prevents accidental leakage of a secret sk.* token to the browser.
  if (!token.startsWith("pk.")) {
    console.error("mapbox-token: configured token is not a public pk.* token; refusing to return it");
    return new Response(
      JSON.stringify({
        error:
          "Configured Mapbox token is not a public token (must start with 'pk.'). Refusing to expose it.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ token }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=300",
    },
  });
});
