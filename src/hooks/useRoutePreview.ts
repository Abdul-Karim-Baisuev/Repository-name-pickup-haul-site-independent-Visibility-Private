import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LegResult = {
  fromIndex: number;
  toIndex: number;
  distanceMeters: number;
  durationSeconds: number;
};

export type RoutePreviewState = {
  legs: LegResult[] | null;
  totalMiles: number | null;
  totalMinutes: number | null;
  loading: boolean;
  error: string | null;
  /** True when at least one stop has no resolved center (skip compute). */
  missingCoords: boolean;
  /** True when computed total exceeds the form's max (500 mi). */
  overLimit: boolean;
};

const METERS_PER_MILE = 1609.344;
const MAX_MILES = 500;
const DEBOUNCE_MS = 500;

// Module-level leg cache keyed by "lng,lat|lng,lat" — survives remounts
// and avoids re-hitting the rate-limited mapbox-route function.
type CacheEntry = { distanceMeters: number; durationSeconds: number; ts: number };
const legCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 100;

const legKey = (a: [number, number], b: [number, number]) =>
  `${a[0].toFixed(5)},${a[1].toFixed(5)}|${b[0].toFixed(5)},${b[1].toFixed(5)}`;

const readCache = (key: string): CacheEntry | null => {
  const e = legCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL_MS) {
    legCache.delete(key);
    return null;
  }
  legCache.delete(key);
  legCache.set(key, e);
  return e;
};

const writeCache = (key: string, entry: CacheEntry) => {
  if (legCache.has(key)) legCache.delete(key);
  legCache.set(key, entry);
  while (legCache.size > CACHE_MAX) {
    const oldest = legCache.keys().next().value;
    if (oldest === undefined) break;
    legCache.delete(oldest);
  }
};

async function fetchLeg(
  from: [number, number],
  to: [number, number],
  signal: AbortSignal,
): Promise<CacheEntry> {
  const key = legKey(from, to);
  const cached = readCache(key);
  if (cached) return cached;

  const url =
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-route` +
    `?from=${from[0]},${from[1]}&to=${to[0]},${to[1]}`;
  const res = await fetch(url, {
    signal,
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`route ${res.status}`);
  const data = await res.json();
  const entry: CacheEntry = {
    distanceMeters: Number(data.distance_meters) || 0,
    durationSeconds: Number(data.duration_seconds) || 0,
    ts: Date.now(),
  };
  writeCache(key, entry);
  return entry;
}

/**
 * Compute summed driving route across consecutive stops.
 * Only fires when every stop has a verified center coordinate.
 */
export function useRoutePreview(centers: ([number, number] | null)[]): RoutePreviewState {
  const [state, setState] = useState<RoutePreviewState>({
    legs: null,
    totalMiles: null,
    totalMinutes: null,
    loading: false,
    error: null,
    missingCoords: false,
    overLimit: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  // Stable signature for the centers array
  const sig = centers
    .map((c) => (c ? `${c[0].toFixed(5)},${c[1].toFixed(5)}` : "x"))
    .join("|");

  useEffect(() => {
    abortRef.current?.abort();

    if (centers.length < 2) {
      setState({
        legs: null,
        totalMiles: null,
        totalMinutes: null,
        loading: false,
        error: null,
        missingCoords: false,
        overLimit: false,
      });
      return;
    }

    const missing = centers.some((c) => !c);
    if (missing) {
      setState({
        legs: null,
        totalMiles: null,
        totalMinutes: null,
        loading: false,
        error: null,
        missingCoords: true,
        overLimit: false,
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState((s) => ({ ...s, loading: true, error: null, missingCoords: false }));

    const timer = setTimeout(async () => {
      try {
        const pairs: Array<[number, number, number, number]> = []; // fromIdx, toIdx implicit
        const legs: LegResult[] = [];
        for (let i = 0; i < centers.length - 1; i++) {
          const from = centers[i] as [number, number];
          const to = centers[i + 1] as [number, number];
          // sequential to keep ordering simple and avoid rate-limit bursts
          const leg = await fetchLeg(from, to, controller.signal);
          if (controller.signal.aborted) return;
          legs.push({
            fromIndex: i,
            toIndex: i + 1,
            distanceMeters: leg.distanceMeters,
            durationSeconds: leg.durationSeconds,
          });
        }
        const totalMeters = legs.reduce((s, l) => s + l.distanceMeters, 0);
        const totalSec = legs.reduce((s, l) => s + l.durationSeconds, 0);
        const totalMiles = totalMeters / METERS_PER_MILE;
        const totalMinutes = totalSec / 60;
        setState({
          legs,
          totalMiles,
          totalMinutes,
          loading: false,
          error: null,
          missingCoords: false,
          overLimit: totalMiles > MAX_MILES,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({
          legs: null,
          totalMiles: null,
          totalMinutes: null,
          loading: false,
          error: (err as Error).message || "Could not compute route",
          missingCoords: false,
          overLimit: false,
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return state;
}
