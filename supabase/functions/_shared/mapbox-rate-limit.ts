// Shared DB-backed rate limiter for Mapbox edge functions.
// Uses a SECURITY DEFINER RPC so counters are consistent across isolates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let lastCleanup = 0;

/**
 * Returns true if the request is allowed, false if it exceeds the limit.
 * Falls back to "allow" on DB errors so legitimate traffic isn't blocked
 * by transient backend issues.
 */
export async function checkRateLimit(
  scope: "geocode" | "route",
  ip: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    // Hash with a per-scope salt so the same IP gets independent buckets
    // and raw IPs are never stored.
    const ipHash = await sha256(`${scope}:${ip}`);

    console.log("rate-limit check", { scope, ipHashPrefix: ipHash.slice(0, 8), max, windowSeconds });

    const { data, error } = await admin.rpc("check_mapbox_rate_limit", {
      _scope: scope,
      _ip_hash: ipHash,
      _max: max,
      _window_seconds: windowSeconds,
    });

    if (error) {
      console.error("rate-limit rpc error", JSON.stringify(error));
      return true; // fail-open
    }

    console.log("rate-limit result", { scope, allowed: data });

    // Opportunistic cleanup once every ~5 min per isolate
    const now = Date.now();
    if (now - lastCleanup > 5 * 60_000) {
      lastCleanup = now;
      admin.rpc("cleanup_mapbox_rate_hits").then(() => {}, () => {});
    }

    return data === true;
  } catch (e) {
    console.error("rate-limit exception", (e as Error).message);
    return true; // fail-open
  }
}
