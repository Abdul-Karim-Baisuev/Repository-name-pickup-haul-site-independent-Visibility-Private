import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  Pause,
  Play,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimate?: {
    public_code: string;
    address: string;
    service_type: string;
    service_direction: string;
    notes: string | null;
    item_dimensions: string | null;
    item_quantity: number;
    stops: unknown;
    preferred_time: string | null;
  };
};

const STAGE_FLOW: { value: Stage; label: string; cta: string }[] = [
  { value: "assigned",        label: "Assigned",         cta: "Start trip to pickup" },
  { value: "en_route_pickup", label: "En route to pickup", cta: "Arrived at pickup" },
  { value: "arrived_pickup",  label: "At pickup",        cta: "Loaded — ready to go" },
  { value: "loaded",          label: "Loaded",           cta: "Start delivery" },
  { value: "in_transit",      label: "In transit",       cta: "Arrived at dropoff" },
  { value: "arrived_dropoff", label: "At dropoff",       cta: "Complete job" },
  { value: "completed",       label: "Completed",        cta: "Done" },
];

const LIVE_STAGES: Stage[] = ["en_route_pickup", "arrived_pickup", "loaded", "in_transit", "arrived_dropoff"];
const PUSH_INTERVAL_MS = 10_000;

const stageMeta = (stage: Stage) => STAGE_FLOW.find((s) => s.value === stage) ?? STAGE_FLOW[0];

const Driver = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDriver, setIsDriver] = useState<boolean | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [trackingId, setTrackingId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const pushTimerRef = useRef<number | null>(null);
  const lastFixRef = useRef<GeolocationPosition | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

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

  const loadAssignments = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_assignments")
      .select(
        `id, estimate_request_id, stage, notes, started_at, completed_at,
         estimate:estimate_requests!inner(
           public_code, address, service_type, service_direction,
           notes, item_dimensions, item_quantity, stops, preferred_time
         )`,
      )
      .eq("driver_id", session.user.id)
      .not("stage", "in", "(completed,canceled)")
      .order("created_at", { ascending: true });

    setLoading(false);
    if (error) {
      toast.error("Could not load assignments", { description: error.message });
      return;
    }
    setAssignments((data ?? []) as unknown as Assignment[]);
  }, [session]);

  useEffect(() => {
    if (isDriver) loadAssignments();
  }, [isDriver, loadAssignments]);

  const advanceStage = async (assignment: Assignment) => {
    const idx = STAGE_FLOW.findIndex((s) => s.value === assignment.stage);
    const next = STAGE_FLOW[idx + 1];
    if (!next || next.value === "completed") {
      const { error } = await supabase
        .from("driver_assignments")
        .update({ stage: "completed", completed_at: new Date().toISOString() })
        .eq("id", assignment.id);
      if (error) return toast.error(error.message);
      toast.success("Job completed");
      stopTracking();
      loadAssignments();
      return;
    }

    const update: { stage: Stage; started_at?: string } = { stage: next.value };
    if (assignment.stage === "assigned") update.started_at = new Date().toISOString();

    const { error } = await supabase
      .from("driver_assignments")
      .update(update)
      .eq("id", assignment.id);
    if (error) return toast.error(error.message);
    toast.success(`Status: ${stageMeta(next.value).label}`);

    if (LIVE_STAGES.includes(next.value) && trackingId !== assignment.id) {
      startTracking(assignment.id);
    }
    if (!LIVE_STAGES.includes(next.value) && trackingId === assignment.id) {
      stopTracking();
    }
    loadAssignments();
  };

  const pushLocation = useCallback(async (assignmentId: string, pos: GeolocationPosition) => {
    const speedMph =
      pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 2.23694 : null;
    const { error } = await supabase.from("driver_locations").insert({
      assignment_id: assignmentId,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      heading: pos.coords.heading ?? null,
      speed_mph: speedMph,
      accuracy_m: pos.coords.accuracy ?? null,
    });
    if (error) console.error("push location:", error);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pushTimerRef.current != null) {
      clearInterval(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    lastFixRef.current = null;
    setTrackingId(null);
  }, []);

  const startTracking = useCallback(
    (assignmentId: string) => {
      if (!("geolocation" in navigator)) {
        toast.error("Geolocation not supported on this device");
        return;
      }

      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (pushTimerRef.current != null) clearInterval(pushTimerRef.current);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          lastFixRef.current = pos;
        },
        (err) => {
          toast.error("GPS error", { description: err.message });
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
      );

      pushTimerRef.current = window.setInterval(() => {
        if (lastFixRef.current) pushLocation(assignmentId, lastFixRef.current);
      }, PUSH_INTERVAL_MS);

      if ("wakeLock" in navigator) {
        (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } })
          .wakeLock.request("screen")
          .then((lock) => {
            wakeLockRef.current = lock;
          })
          .catch(() => {});
      }

      setTrackingId(assignmentId);
      toast.success("Live location ON", { description: "Sharing your position with the customer." });
    },
    [pushLocation],
  );

  useEffect(() => () => stopTracking(), [stopTracking]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (error) toast.error(error.message);
  };

  const handleSignOut = async () => {
    stopTracking();
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEO title="Driver — PICKUP HAUL" description="Driver workspace" canonical="https://www.autobais.app/driver" />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-primary/15 blur-[140px]" />
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          {session && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/driver/tracking">
                  <Navigation className="h-4 w-4 mr-2" />
                  Map
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          )}
        </div>

        <div className="mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 ring-1 ring-primary/30 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-primary">
            <Truck className="h-3 w-3" />
            Driver workspace
          </div>
          <h1 className="font-heading text-3xl md:text-4xl uppercase tracking-tight">Today's Jobs</h1>
        </div>

        {!session && (
          <form
            onSubmit={handleSignIn}
            className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-secondary/40 border-white/5 h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-secondary/40 border-white/5 h-12 rounded-xl"
              />
            </div>
            <Button type="submit" disabled={signingIn} className="w-full h-12 rounded-xl font-heading uppercase tracking-wider">
              {signingIn ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        )}

        {session && isDriver === false && (
          <div className="rounded-2xl bg-rose-500/5 ring-1 ring-rose-500/30 p-6 text-sm">
            <p className="text-rose-300 font-medium mb-1">Driver role required</p>
            <p className="text-muted-foreground">
              Your account doesn't have driver access. Ask an admin to grant the <code className="font-mono text-primary">driver</code> role.
            </p>
          </div>
        )}

        {session && isDriver && (
          <>
            {loading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-8 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-primary mb-3" />
                <p className="font-heading uppercase tracking-wide text-lg">All clear</p>
                <p className="text-sm text-muted-foreground">No active jobs assigned to you right now.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={loadAssignments}>
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((a) => {
                  const meta = stageMeta(a.stage);
                  const isLiveOn = trackingId === a.id;
                  const stops = Array.isArray(a.estimate?.stops) ? (a.estimate?.stops as unknown[]) : [];
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-5 space-y-4 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25)]"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                            {a.estimate?.service_type}
                          </div>
                          <div className="font-mono text-primary tracking-wider">{a.estimate?.public_code}</div>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 ring-1 ring-primary/30 px-3 py-1 text-xs">
                          {meta.label}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                              {a.estimate?.service_direction === "dropoff" ? "Dropoff" : "Pickup"}
                            </div>
                            <div>{a.estimate?.address}</div>
                          </div>
                        </div>
                        {stops.map((s, i) => {
                          const label = typeof s === "string" ? s : ((s as { address?: string })?.address ?? "");
                          if (!label) return null;
                          return (
                            <div key={i} className="flex items-start gap-2 pl-6">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground shrink-0 mt-0.5">
                                Stop {i + 1}
                              </span>
                              <span className="text-foreground">{label}</span>
                            </div>
                          );
                        })}
                        {a.estimate?.notes && (
                          <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap mt-2">
                            {a.estimate.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl"
                        >
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.estimate?.address ?? "")}`}
                            target="_blank"
                            rel="noopener"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Navigate
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant={isLiveOn ? "destructive" : "secondary"}
                          className="flex-1 rounded-xl"
                          onClick={() => (isLiveOn ? stopTracking() : startTracking(a.id))}
                        >
                          {isLiveOn ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Stop sharing GPS
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Share GPS
                            </>
                          )}
                        </Button>
                      </div>

                      <Button
                        onClick={() => advanceStage(a)}
                        className="w-full h-12 rounded-xl font-heading uppercase tracking-wider"
                      >
                        {meta.cta}
                      </Button>
                    </div>
                  );
                })}

                {trackingId && (
                  <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-xs z-40">
                    <div className="rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/40 backdrop-blur-xl p-3 flex items-center gap-3 text-xs">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                      </span>
                      <span className="text-emerald-200">Live GPS streaming · every {PUSH_INTERVAL_MS / 1000}s</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Driver;
