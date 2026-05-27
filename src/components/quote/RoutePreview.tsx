import { Loader2, Navigation, Clock, AlertTriangle } from "lucide-react";
import type { RoutePreviewState } from "@/hooks/useRoutePreview";

const METERS_PER_MILE = 1609.344;

const formatMinutes = (mins: number) => {
  const m = Math.round(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
};

const stopLabel = (i: number) => String.fromCharCode(65 + i);

type Props = {
  state: RoutePreviewState;
  /** Total stop count, used to render skeleton chip count. */
  stopCount: number;
};

const RoutePreview = ({ state, stopCount }: Props) => {
  const { legs, totalMiles, totalMinutes, loading, error, missingCoords, overLimit } = state;

  if (stopCount < 2) return null;

  // Helper text path (no coords yet) — keep card hidden, parent shows hint
  if (missingCoords && !loading) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-white/5 bg-secondary/40 p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          Calculating route…
        </div>
        <div className="mt-3 flex gap-3">
          <div className="h-7 w-24 rounded-md bg-muted/40 animate-pulse" />
          <div className="h-7 w-20 rounded-md bg-muted/40 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-destructive">
        Could not compute route. Enter miles manually.
      </div>
    );
  }

  if (legs == null || totalMiles == null || totalMinutes == null) return null;

  const miles = totalMiles.toFixed(1);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-secondary/40 to-secondary/40 p-4">
      <div
        className="pointer-events-none absolute -top-12 -right-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="font-heading text-2xl text-foreground tracking-wide">
            {miles}
          </span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            mi
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary/70" />
          <span className="font-heading text-base text-foreground">
            ~ {formatMinutes(totalMinutes)}
          </span>
        </div>
      </div>

      {legs.length > 1 && (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {legs.map((leg) => (
            <span
              key={`${leg.fromIndex}-${leg.toIndex}`}
              className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-background/40 px-2 py-1 text-[10px] tracking-wide text-muted-foreground"
            >
              <span className="font-heading text-primary">
                {stopLabel(leg.fromIndex)}→{stopLabel(leg.toIndex)}
              </span>
              <span>
                {(leg.distanceMeters / METERS_PER_MILE).toFixed(1)} mi ·{" "}
                {formatMinutes(leg.durationSeconds / 60)}
              </span>
            </span>
          ))}
        </div>
      )}

      {overLimit && (
        <div className="relative mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Route exceeds 500 mi limit. Contact us directly for long-distance hauls — miles
            field not auto-filled.
          </span>
        </div>
      )}
    </div>
  );
};

export default RoutePreview;
