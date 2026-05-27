import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ArrowLeft, Clock, Crosshair, Gauge, Loader2, LocateFixed, LogOut, MapPin, Navigation, RefreshCw, Truck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { cn } from "@/lib/utils";

type Stage =
  | "assigned"
  | "en_route_pickup"
  | "arrived_pickup"
  | "loaded"
  | "in_transit"
  | "arrived_dropoff"
  | "completed"
  | "canceled";

type Assignment = {
  id: string;
  estimate_request_id: string;
  stage: Stage;
  started_at: string | null;
  estimate?: {
    public_code: string;
    address: string;
    service_type: string;
    service_direction: string;
    stops: unknown;
  };
};

type Location = {
  lat: number;
  lng: number;
  heading: number | null;
  speed_mph: number | null;
  recorded_at: string;
};

const ACTIVE_STAGES: Stage[] = [
  "assigned",
  "en_route_pickup",
  "arrived_pickup",
  "loaded",
  "in_transit",
  "arrived_dropoff",
];

const STAGE_LABEL: Record<Stage, string> = {
  assigned: "Assigned",
  en_route_pickup: "En route to pickup",
  arrived_pickup: "At pickup",
  loaded: "Loaded",
  in_transit: "In transit",
  arrived_dropoff: "At dropoff",
  completed: "Completed",
  canceled: "Canceled",
};

const formatRelative = (iso: string | null) => {
  if (!iso) return "—";
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const HISTORY_LIMIT = 20;

const DriverTracking = () => {
  const navigate = useNavigate();
  const { token: mapboxToken, loading: tokenLoading } = useMapboxToken();

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDriver, setIsDriver] = useState<boolean | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Location[]>([]);
  const [autoFollow, setAutoFollow] = useState(true);
  const autoFollowRef = useRef(true);
  useEffect(() => {
    autoFollowRef.current = autoFollow;
  }, [autoFollow]);
  const [courseUp, setCourseUp] = useState(false);
  const courseUpRef = useRef(false);
  const lastBearingRef = useRef<number>(0);
  const transitioningRef = useRef(false);
  useEffect(() => {
    courseUpRef.current = courseUp;
    const map = mapRef.current;
    if (!map) return;

    // Pause location-driven camera updates during the transition so they
    // don't interrupt the easing between modes.
    transitioningRef.current = true;
    const TRANSITION_MS = 900;

    if (courseUp) {
      const target = lastBearingRef.current ?? 0;
      const current = map.getBearing();
      const delta = ((target - current + 540) % 360) - 180;
      map.easeTo({
        bearing: current + delta,
        pitch: 50,
        duration: TRANSITION_MS,
        essential: true,
      });
    } else {
      const current = map.getBearing();
      const delta = ((0 - current + 540) % 360) - 180;
      map.easeTo({
        bearing: current + delta,
        pitch: 0,
        duration: TRANSITION_MS,
        essential: true,
      });
    }

    const t = window.setTimeout(() => {
      transitioningRef.current = false;
    }, TRANSITION_MS + 50);
    return () => window.clearTimeout(t);
  }, [courseUp]);
  const location = history[0] ?? null;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const truckMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const lastPathKeyRef = useRef<string>("");
  const lastHeadKeyRef = useRef<string>("");
  const lastTruckKeyRef = useRef<string>("");
  const lastGeocodedAddrRef = useRef<string>("");
  const truckCenteredRef = useRef(false);

  // ---- auth ----
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsDriver(null);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (error) {
        setIsDriver(false);
        return;
      }
      setIsDriver((data ?? []).some((r) => r.role === "driver"));
    })();
  }, [session]);

  // ---- assignments ----
  // Use a ref so loadAssignments stays stable across selectedId changes
  // (avoids re-running the loader effect every time the user picks a route).
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadAssignments = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_assignments")
      .select(
        `id, estimate_request_id, stage, started_at,
         estimate:estimate_requests!inner(
           public_code, address, service_type, service_direction, stops
         )`,
      )
      .eq("driver_id", session.user.id)
      .in("stage", ACTIVE_STAGES)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error("Could not load routes", { description: error.message });
      return;
    }
    const list = (data ?? []) as unknown as Assignment[];
    setAssignments(list);
    const current = selectedIdRef.current;
    if (list.length && !list.some((a) => a.id === current)) {
      setSelectedId(list[0].id);
    } else if (!list.length) {
      setSelectedId(null);
    }
  }, [session]);

  useEffect(() => {
    if (isDriver) loadAssignments();
  }, [isDriver, loadAssignments]);

  // ---- location history for selected assignment ----
  const fetchHistory = useCallback(async (assignmentId: string) => {
    const { data, error } = await supabase
      .from("driver_locations")
      .select("lat, lng, heading, speed_mph, recorded_at")
      .eq("assignment_id", assignmentId)
      .order("recorded_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) return;
    setHistory((data ?? []) as Location[]);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setHistory([]);
      return;
    }
    // Reset immediately so stale points from a different route don't flash.
    setHistory([]);
    let active = true;
    fetchHistory(selectedId);
    const channel = supabase
      .channel(`driver-tracking-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
          filter: `assignment_id=eq.${selectedId}`,
        },
        (payload) => {
          if (!active) return;
          const r = payload.new as Location;
          setHistory((prev) => {
            if (prev.some((p) => p.recorded_at === r.recorded_at)) return prev;
            return [r, ...prev].slice(0, HISTORY_LIMIT);
          });
        },
      )
      .subscribe();
    const t = window.setInterval(() => {
      if (active) fetchHistory(selectedId);
    }, 15_000);
    return () => {
      active = false;
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, [selectedId, fetchHistory]);

  const selected = useMemo(
    () => assignments.find((a) => a.id === selectedId) ?? null,
    [assignments, selectedId],
  );

  const [mapLoaded, setMapLoaded] = useState(false);

  // ---- mapbox setup ----
  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-118.4, 34.18],
      zoom: 10,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      // ---- animated pulsing dot image (Mapbox StyleImageInterface) ----
      const size = 140;
      let dotCtx: CanvasRenderingContext2D | null = null;
      const pulsingDot = {
        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),
        onAdd() {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          dotCtx = canvas.getContext("2d");
        },
        render(this: { data: Uint8Array }) {
          const duration = 1400;
          const t = (performance.now() % duration) / duration;
          const radius = (size / 2) * 0.28;
          const outerRadius = (size / 2) * 0.28 + (size / 2) * 0.7 * t;
          if (!dotCtx) return false;
          dotCtx.clearRect(0, 0, size, size);
          dotCtx.beginPath();
          dotCtx.arc(size / 2, size / 2, outerRadius, 0, Math.PI * 2);
          dotCtx.fillStyle = `hsla(24, 100%, 55%, ${0.35 * (1 - t)})`;
          dotCtx.fill();
          dotCtx.beginPath();
          dotCtx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
          dotCtx.fillStyle = "hsl(24, 100%, 60%)";
          dotCtx.strokeStyle = "rgba(255,255,255,0.85)";
          dotCtx.lineWidth = 3;
          dotCtx.fill();
          dotCtx.stroke();
          this.data = new Uint8Array(dotCtx.getImageData(0, 0, size, size).data.buffer);
          map.triggerRepaint();
          return true;
        },
      };
      if (!map.hasImage("pulsing-dot")) {
        map.addImage("pulsing-dot", pulsingDot as unknown as ImageData, { pixelRatio: 2 });
      }

      map.addSource("driver-path", {
        type: "geojson",
        lineMetrics: true,
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: "driver-path-glow",
        type: "line",
        source: "driver-path",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": 12,
          "line-blur": 6,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0, "hsla(24, 95%, 53%, 0)",
            0.5, "hsla(24, 95%, 53%, 0.12)",
            1, "hsla(24, 95%, 53%, 0.55)",
          ],
        },
      });
      map.addLayer({
        id: "driver-path-line",
        type: "line",
        source: "driver-path",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": ["interpolate", ["linear"], ["line-progress"], 0, 2, 1, 4.5],
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,    "hsla(24, 30%, 50%, 0.25)",
            0.35, "hsla(24, 70%, 55%, 0.55)",
            0.7,  "hsla(24, 90%, 55%, 0.85)",
            1,    "hsl(24, 100%, 60%)",
          ],
        },
      });

      // pulsing head point
      map.addSource("driver-head", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "driver-head-pulse",
        type: "symbol",
        source: "driver-head",
        layout: { "icon-image": "pulsing-dot", "icon-allow-overlap": true },
      });

      setMapLoaded(true);
    });
    return () => {
      setMapLoaded(false);
      map.remove();
      mapRef.current = null;
      truckMarkerRef.current = null;
      destMarkerRef.current = null;
    };
  }, [mapboxToken]);

  // ---- path line from history (skip if coords unchanged) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const src = map.getSource("driver-path") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const coords: [number, number][] = [];
    for (let i = history.length - 1; i >= 0; i--) {
      coords.push([history[i].lng, history[i].lat]);
    }
    const key = `${coords.length}:${coords[0]?.join(",") ?? ""}|${coords[coords.length - 1]?.join(",") ?? ""}`;
    if (key === lastPathKeyRef.current) return;
    lastPathKeyRef.current = key;
    src.setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    });
  }, [history, mapLoaded]);

  // ---- dest marker: only re-geocode when address changes ----
  const destAddress = selected?.estimate?.address ?? "";
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapboxToken || !destAddress) return;
    if (lastGeocodedAddrRef.current === destAddress && destMarkerRef.current) return;
    let cancelled = false;
    (async () => {
      // Route through proxy so it shares the same per-IP rate limit and
      // never depends on the public token having geocoding scopes.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-geocode?q=${encodeURIComponent(destAddress)}`;
      try {
        const r = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        const j = await r.json();
        const c = j?.suggestions?.[0]?.center as [number, number] | undefined;
        if (cancelled || !c) return;
        lastGeocodedAddrRef.current = destAddress;
        if (destMarkerRef.current) destMarkerRef.current.remove();
        const el = document.createElement("div");
        el.className =
          "h-3 w-3 rounded-full bg-primary ring-4 ring-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.8)]";
        destMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(c).addTo(map);
        if (!truckCenteredRef.current) map.flyTo({ center: c, zoom: 12 });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destAddress, mapboxToken]);

  // ---- head pulse point (separate, lightweight) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const headSrc = map.getSource("driver-head") as mapboxgl.GeoJSONSource | undefined;
    if (!headSrc) return;
    const headKey = location ? `${location.lng},${location.lat}` : "";
    if (headKey === lastHeadKeyRef.current) return;
    lastHeadKeyRef.current = headKey;
    headSrc.setData({
      type: "FeatureCollection",
      features: location
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [location.lng, location.lat] },
              properties: {},
            },
          ]
        : [],
    });
  }, [location, mapLoaded]);

  // ---- truck DOM marker (separate from head pulse) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!location) {
      truckMarkerRef.current?.remove();
      truckMarkerRef.current = null;
      lastTruckKeyRef.current = "";
      return;
    }
    const truckKey = `${location.lng},${location.lat}`;
    if (truckKey === lastTruckKeyRef.current) return;
    lastTruckKeyRef.current = truckKey;
    const lngLat: [number, number] = [location.lng, location.lat];
    if (!truckMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "relative";
      el.innerHTML =
        '<span class="absolute inset-0 -m-3 rounded-full bg-primary/40 animate-ping pointer-events-none"></span>' +
        '<span class="absolute inset-0 -m-1.5 rounded-full bg-primary/20 animate-pulse pointer-events-none"></span>' +
        '<div class="relative grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.7)] ring-2 ring-background">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">' +
        '<path d="M5 18H3V6h13v12h-2"/><path d="M14 9h4l3 4v5h-2"/>' +
        '<circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>' +
        '</svg></div>';
      truckMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
    } else {
      truckMarkerRef.current.setLngLat(lngLat);
    }
    // Compute heading from previous → current point (fall back to recorded heading if available)
    const prev = history[1];
    const computeBearing = (a: { lng: number; lat: number }, b: { lng: number; lat: number }) => {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const toDeg = (r: number) => (r * 180) / Math.PI;
      const φ1 = toRad(a.lat);
      const φ2 = toRad(b.lat);
      const Δλ = toRad(b.lng - a.lng);
      const y = Math.sin(Δλ) * Math.cos(φ2);
      const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
      return (toDeg(Math.atan2(y, x)) + 360) % 360;
    };
    const bearing = prev ? computeBearing(prev, location) : location.heading ?? lastBearingRef.current ?? 0;
    lastBearingRef.current = bearing;

    // Offset the camera ahead of the truck along the direction of travel (~120m at zoom 15)
    const lookaheadMeters = 140;
    const offsetAhead = (lng: number, lat: number, brg: number, meters: number): [number, number] => {
      const R = 6378137;
      const δ = meters / R;
      const θ = (brg * Math.PI) / 180;
      const φ1 = (lat * Math.PI) / 180;
      const λ1 = (lng * Math.PI) / 180;
      const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
      const λ2 =
        λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
      return [(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI];
    };

    // Pick the shortest rotation arc from the map's current bearing.
    const shortestBearing = (target: number) => {
      const current = map.getBearing();
      const delta = ((target - current + 540) % 360) - 180;
      return current + delta;
    };

    const center: [number, number] =
      courseUpRef.current && prev ? offsetAhead(location.lng, location.lat, bearing, lookaheadMeters) : lngLat;

    // Don't fight an in-flight mode transition.
    if (transitioningRef.current) return;

    if (!truckCenteredRef.current) {
      if (autoFollowRef.current) {
        map.flyTo({
          center,
          zoom: 15,
          speed: 0.6,
          ...(courseUpRef.current ? { bearing: shortestBearing(bearing), pitch: 50 } : {}),
        });
      }
      truckCenteredRef.current = true;
    } else if (autoFollowRef.current) {
      map.easeTo({
        center,
        duration: 800,
        ...(courseUpRef.current ? { bearing: shortestBearing(bearing), pitch: 50 } : {}),
      });
    }
  }, [location, history]);

  // Reset center / cached keys when switching routes
  useEffect(() => {
    truckCenteredRef.current = false;
    lastPathKeyRef.current = "";
    lastHeadKeyRef.current = "";
    lastTruckKeyRef.current = "";
  }, [selectedId]);

  const focusRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: [number, number][] = history.map((p) => [p.lng, p.lat]);
    const destLngLat = destMarkerRef.current?.getLngLat();
    if (destLngLat) pts.push([destLngLat.lng, destLngLat.lat]);
    if (pts.length === 0) {
      toast.message("No route points yet to focus on.");
      return;
    }
    if (pts.length === 1) {
      map.flyTo({ center: pts[0], zoom: 14, speed: 0.8 });
      return;
    }
    const bounds = pts.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(pts[0], pts[0]),
    );
    map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 15 });
  }, [history]);

  // ---- auth handlers ----
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground p-6">
        <div className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-6 text-center max-w-sm">
          <Truck className="h-8 w-8 mx-auto mb-3 text-primary" />
          <p className="font-heading uppercase tracking-wide mb-2">Sign in required</p>
          <p className="text-sm text-muted-foreground mb-4">
            Driver tracking is private. Please sign in on the driver workspace first.
          </p>
          <Button asChild className="w-full rounded-xl">
            <Link to="/driver">Go to Driver workspace</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (isDriver === false) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground p-6">
        <div className="rounded-2xl bg-rose-500/5 ring-1 ring-rose-500/30 p-6 max-w-sm text-sm">
          <p className="text-rose-300 font-medium mb-1">Driver role required</p>
          <p className="text-muted-foreground">
            Your account doesn't have driver access. Ask an admin to grant the{" "}
            <code className="font-mono text-primary">driver</code> role.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEO
        title="Driver Tracking — PICKUP HAUL"
        description="Live map of your active pickup and haul routes."
        canonical="https://www.autobais.app/driver/tracking"
      />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-primary/15 blur-[140px]" />
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/driver"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Driver
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>

        <div className="mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 ring-1 ring-primary/30 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-primary">
            <Navigation className="h-3 w-3" />
            Live tracking
          </div>
          <h1 className="font-heading text-3xl md:text-4xl uppercase tracking-tight">My Routes</h1>
          <p className="text-sm text-muted-foreground">
            Active pickup &amp; haul jobs assigned to you. Tap a route to see it on the map.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Active ({assignments.length})
              </span>
              <Button variant="ghost" size="sm" onClick={loadAssignments} disabled={loading}>
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
            </div>

            {loading && assignments.length === 0 ? (
              <div className="grid place-items-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-6 text-center text-sm">
                <p className="font-heading uppercase tracking-wide mb-1">No active routes</p>
                <p className="text-muted-foreground">You're all caught up.</p>
              </div>
            ) : (
              assignments.map((a) => {
                const isActive = a.id === selectedId;
                const stops = Array.isArray(a.estimate?.stops)
                  ? (a.estimate?.stops as { address?: string }[])
                  : [];
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "w-full text-left rounded-2xl bg-card/60 ring-1 backdrop-blur-xl p-4 transition",
                      isActive
                        ? "ring-primary/60 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.45)]"
                        : "ring-border hover:ring-primary/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                          {a.estimate?.service_type}
                        </div>
                        <div className="font-mono text-primary tracking-wider text-sm">
                          {a.estimate?.public_code}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-primary/10 ring-1 ring-primary/30 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                        {STAGE_LABEL[a.stage]}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                      <span className="line-clamp-2">{a.estimate?.address}</span>
                    </div>
                    {stops.length > 0 && (
                      <div className="mt-1 text-[11px] text-muted-foreground pl-5">
                        +{stops.length} stop{stops.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Map */}
          <div className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl overflow-hidden">
            <div className="relative h-[480px] lg:h-[640px]">
              {tokenLoading || !mapboxToken ? (
                <div className="absolute inset-0 grid place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : null}
              <div ref={containerRef} className="absolute inset-0" />

              {/* Map controls overlay */}
              <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
                <div className="pointer-events-auto rounded-xl bg-background/80 backdrop-blur-xl ring-1 ring-border px-3 py-2 flex items-center gap-2.5">
                  <Crosshair className="h-3.5 w-3.5 text-primary" />
                  <Label
                    htmlFor="auto-follow"
                    className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground cursor-pointer select-none"
                  >
                    Auto-follow
                  </Label>
                  <Switch
                    id="auto-follow"
                    checked={autoFollow}
                    onCheckedChange={setAutoFollow}
                    className="scale-90"
                  />
                </div>
                <div className="pointer-events-auto rounded-xl bg-background/80 backdrop-blur-xl ring-1 ring-border px-3 py-2 flex items-center gap-2.5">
                  <Navigation className="h-3.5 w-3.5 text-primary" />
                  <Label
                    htmlFor="course-up"
                    className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground cursor-pointer select-none"
                  >
                    Course-up
                  </Label>
                  <Switch
                    id="course-up"
                    checked={courseUp}
                    onCheckedChange={setCourseUp}
                    disabled={!autoFollow}
                    className="scale-90"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={focusRoute}
                  disabled={!selected}
                  className="pointer-events-auto rounded-xl bg-background/80 backdrop-blur-xl ring-1 ring-border hover:bg-background/90"
                >
                  <LocateFixed className="h-3.5 w-3.5 mr-2" />
                  Focus on route
                </Button>
              </div>

              {selected && (
                <div className="pointer-events-none absolute left-3 right-3 bottom-3">
                  <div className="pointer-events-auto rounded-xl bg-background/80 backdrop-blur-xl ring-1 ring-border p-3 text-xs flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-primary">{selected.estimate?.public_code}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{STAGE_LABEL[selected.stage]}</span>
                    <span className="text-muted-foreground">·</span>
                    {location ? (
                      <span className="text-muted-foreground">
                        Last fix {formatRelative(location.recorded_at)}
                        {location.speed_mph != null
                          ? ` · ${Math.round(location.speed_mph)} mph`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No live position yet</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History panel */}
        {selected && (
          <div className="mt-4 rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Recent positions
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({history.length}/{HISTORY_LIMIT})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedId && fetchHistory(selectedId)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No location pings recorded for this route yet.
              </p>
            ) : (
              <ol className="relative max-h-[280px] overflow-y-auto pr-1 space-y-1.5">
                {history.map((p, idx) => (
                  <li
                    key={`${p.recorded_at}-${idx}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-xs ring-1 ring-transparent transition",
                      idx === 0
                        ? "bg-primary/10 ring-primary/30"
                        : "bg-background/40 hover:ring-border",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        idx === 0 ? "bg-primary shadow-[0_0_10px_hsl(var(--primary))] animate-pulse" : "bg-muted-foreground/50",
                      )}
                    />
                    <span className="font-mono tabular-nums text-foreground/90 w-20 shrink-0">
                      {formatTime(p.recorded_at)}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-mono tabular-nums text-muted-foreground hidden sm:inline">
                      {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground sm:hidden">
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                    </span>
                    {p.speed_mph != null && (
                      <>
                        <span className="text-muted-foreground ml-auto">·</span>
                        <span className="inline-flex items-center gap-1 text-foreground/80">
                          <Gauge className="h-3 w-3 text-primary" />
                          {Math.round(p.speed_mph)} mph
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground ml-auto sm:ml-0 text-[10px]">
                      {formatRelative(p.recorded_at)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default DriverTracking;
