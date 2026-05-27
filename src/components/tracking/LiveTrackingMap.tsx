import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, Truck, MapPin, Clock, RefreshCw, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMapboxToken } from "@/hooks/useMapboxToken";

type TrackingRow = {
  stage: string;
  service_type: string;
  service_direction: string;
  dest_area: string | null;
  driver_first_name: string | null;
  vehicle_label: string | null;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speed_mph: number | null;
  recorded_at: string | null;
  started_at: string | null;
  is_live: boolean;
};

const STAGE_LABEL: Record<string, string> = {
  unassigned: "Driver not assigned yet",
  assigned: "Driver assigned · waiting to start",
  en_route_pickup: "Driver en route to pickup",
  arrived_pickup: "Driver at pickup location",
  loaded: "Loaded — preparing to leave",
  in_transit: "On the way to dropoff",
  arrived_dropoff: "Arrived at destination",
  completed: "Delivery completed",
  canceled: "Delivery canceled",
};

const ENDED_STAGES = new Set(["completed", "canceled"]);

const STAGE_ETA_HINT: Record<string, string> = {
  unassigned: "We'll assign a driver shortly",
  assigned: "Driver will start the run soon",
  en_route_pickup: "Driver is heading to pickup",
  arrived_pickup: "Loading now — typically 10–20 min",
  loaded: "Leaving pickup shortly",
  in_transit: "On the way — ETA depends on traffic",
  arrived_dropoff: "Driver has arrived at the dropoff",
};

interface Props {
  token: string;
  last4: string;
}

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

export const LiveTrackingMap = ({ token, last4 }: Props) => {
  const { token: mapboxToken, loading: tokenLoading } = useMapboxToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const truckMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [tracking, setTracking] = useState<TrackingRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTracking = async () => {
    const { data, error } = await supabase.rpc("get_tracking_by_token", {
      _token: token,
      _phone_last4: last4,
    });
    if (error) {
      const isRateLimit = error.message?.includes("rate_limited");
      setError(
        isRateLimit
          ? "Too many attempts. Please try again later."
          : "Could not load tracking. Please try again."
      );
      setLoading(false);
      return;
    }
    const row = Array.isArray(data) ? (data[0] as TrackingRow | undefined) : undefined;
    setTracking(row ?? null);
    setLoading(false);
  };

  // Periodic refetch — stop polling once delivery has ended
  useEffect(() => {
    fetchTracking();
    const id = setInterval(() => {
      if (tracking && ENDED_STAGES.has(tracking.stage)) return;
      fetchTracking();
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, last4, tracking?.stage]);

  // Init map
  useEffect(() => {
    if (!mapboxToken || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-118.4452, 34.1869],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    // Keep the map sized correctly on mobile (iOS Safari URL bar, rotation, etc.)
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    const onWinResize = () => map.resize();
    window.addEventListener("orientationchange", onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", onWinResize);
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  // Truck marker — only when live
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const showLive =
      tracking?.is_live && tracking.lat != null && tracking.lng != null;

    if (!showLive) {
      truckMarkerRef.current?.remove();
      truckMarkerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [tracking!.lng!, tracking!.lat!];
    if (!truckMarkerRef.current) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="position:relative;width:44px;height:44px;display:grid;place-items:center;">
          <div style="position:absolute;inset:0;border-radius:9999px;background:hsl(24 95% 53% / 0.35);animation:pulse-truck 2s ease-out infinite;"></div>
          <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:hsl(24 95% 53%);box-shadow:0 4px 14px hsl(24 95% 53% / 0.5);display:grid;place-items:center;color:white;font-weight:700;font-size:18px;">🚚</div>
        </div>
        <style>@keyframes pulse-truck{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(2.2);opacity:0}}</style>
      `;
      truckMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      map.flyTo({ center: lngLat, zoom: 13, duration: 800 });
    } else {
      truckMarkerRef.current.setLngLat(lngLat);
    }
  }, [tracking?.is_live, tracking?.lat, tracking?.lng]);

  if (tokenLoading || loading) {
    return (
      <div className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-8 grid place-items-center min-h-[280px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="rounded-2xl bg-rose-500/5 ring-1 ring-rose-500/30 p-5 text-sm">
        <p className="text-rose-300 font-medium mb-1">Tracking unavailable</p>
        <p className="text-muted-foreground">
          We couldn't find a delivery for this link. Please double-check your tracking link and the last 4 digits of your phone.
        </p>
      </div>
    );
  }

  const stageLabel = STAGE_LABEL[tracking.stage] ?? tracking.stage;
  const ended = ENDED_STAGES.has(tracking.stage);
  const driverLabel = [tracking.driver_first_name, tracking.vehicle_label]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl overflow-hidden shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25)]">
      <div className="p-5 border-b border-border space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Live tracking
            </span>
            {tracking.is_live && (
              <span className="inline-flex items-center gap-1.5 ml-2 text-[10px] uppercase tracking-wider text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Live
              </span>
            )}
          </div>
          {!ended && (
            <button
              onClick={fetchTracking}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          )}
        </div>

        <div className="font-heading uppercase tracking-tight text-lg">{stageLabel}</div>
        {!ended && STAGE_ETA_HINT[tracking.stage] && (
          <div className="text-xs text-muted-foreground -mt-1">{STAGE_ETA_HINT[tracking.stage]}</div>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {driverLabel && (
            <div className="inline-flex items-center gap-1.5 text-foreground">
              <Truck className="h-3.5 w-3.5 text-primary" />
              <span>{driverLabel}</span>
            </div>
          )}
          {tracking.recorded_at && (
            <div className="text-muted-foreground">
              Updated <span className="text-foreground">{formatTime(tracking.recorded_at)}</span>
            </div>
          )}
        </div>

        {tracking.dest_area && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
            <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
            <span className="truncate">Heading toward {tracking.dest_area}</span>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className={`w-full bg-secondary/20 h-[55svh] min-h-[280px] max-h-[520px] sm:h-[360px] ${ended ? "hidden" : ""}`}
      />

      {!tracking.is_live && !ended && (
        <div className="p-4 text-center text-xs text-muted-foreground border-t border-border inline-flex items-center justify-center gap-2 w-full">
          <Clock className="h-3.5 w-3.5" />
          Driver hasn't started sharing live location yet. The map will update automatically.
        </div>
      )}

      {ended && (
        <div className="p-5 text-center text-sm border-t border-border">
          <div className="inline-flex items-center justify-center gap-2 text-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {tracking.stage === "completed" ? "Delivery completed" : "Delivery canceled"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Live location sharing has ended. Thank you for choosing PICKUP HAUL.
          </p>
        </div>
      )}
    </div>
  );
};
