import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: string | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.functions.invoke("mapbox-token");
    if (error || !data?.token) return null;
    cached = data.token as string;
    return cached;
  })();
  const result = await inflight;
  inflight = null;
  return result;
}

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let active = true;
    if (cached) return;
    fetchToken().then((t) => {
      if (active) {
        setToken(t);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { token, loading };
}
