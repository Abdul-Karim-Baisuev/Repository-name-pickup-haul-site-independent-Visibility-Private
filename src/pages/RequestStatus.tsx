import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Loader2, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { z } from "zod";

import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  checkLockout,
  recordFailure,
  recordSuccess,
  formatRetry,
} from "@/lib/trackingThrottle";

type StatusRow = {
  public_code: string;
  status: string;
  service_type: string;
  service_direction: string;
  preferred_date: string | null;
  preferred_time: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  new: { label: "Received — awaiting review", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  in_progress: { label: "In progress — we're on it", tone: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
  done: { label: "Completed", tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  canceled: { label: "Canceled", tone: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
};

const lookupSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, "Enter your tracking code (e.g. EST-AB12CD)")
    .max(20, "Code is too long")
    .regex(/^[A-Za-z0-9-]+$/i, "Code can only contain letters, numbers and dashes"),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter the last 4 digits of your phone"),
});

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
};

const formatPreferredDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const RequestStatus = () => {
  const [code, setCode] = useState("");
  const [last4, setLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusRow | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Pre-fill from URL params or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
      return;
    }
    try {
      const saved = localStorage.getItem("pickuphaul_last_request_code");
      if (saved) setCode(saved);
    } catch {
      /* noop */
    }
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = lookupSchema.safeParse({ code, last4 });
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Please check the form";
      toast.error(first);
      return;
    }

    const normCode = parsed.data.code.toUpperCase();

    const lock = checkLockout("code", normCode);
    if (lock.locked) {
      toast.error("Too many attempts", {
        description: `For your security, please try again in ${formatRetry(lock.retryInSec)}.`,
      });
      return;
    }

    setLoading(true);
    setNotFound(false);
    setResult(null);

    const { data, error } = await supabase.rpc("get_estimate_status", {
      _code: normCode,
      _phone_last4: parsed.data.last4,
    });

    setLoading(false);

    if (error) {
      console.error("get_estimate_status failed:", error);
      const isRateLimit = error.message?.includes("rate_limited");
      if (isRateLimit) recordFailure("code", normCode);
      toast.error(
        isRateLimit ? "Too many attempts" : "Could not check status",
        {
          description: isRateLimit
            ? "Please try again later."
            : "Please try again in a moment or text us on WhatsApp (747) 370-6885.",
        }
      );
      return;
    }

    const row = Array.isArray(data) ? (data[0] as StatusRow | undefined) : undefined;
    if (!row) {
      const next = recordFailure("code", normCode);
      setNotFound(true);
      if (next.locked) {
        toast.error("Too many attempts", {
          description: `For your security, please try again in ${formatRetry(next.retryInSec)}.`,
        });
      } else if (next.remaining <= 2) {
        toast.warning(`${next.remaining} attempts left before a temporary lockout.`);
      }
      return;
    }
    recordSuccess("code", normCode);
    setResult(row);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEO
        title="Check Request Status | PICKUP HAUL"
        description="Look up the live status of your PICKUP HAUL request using your tracking code and the last 4 digits of your phone number."
        canonical="https://www.autobais.app/status"
      />

      {/* Aurora backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-10 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <div className="space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 ring-1 ring-primary/30 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-primary">
            <ShieldCheck className="h-3 w-3" />
            Secure status lookup
          </div>
          <h1 className="font-heading text-3xl md:text-4xl uppercase tracking-tight">
            Check Your Request
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            Enter the tracking code we gave you (e.g. <span className="text-primary font-mono">EST-AB12CD</span>) and the
            last 4 digits of the phone number you used. No need to fill the whole form again.
          </p>
        </div>

        {/* Lookup form */}
        <form
          onSubmit={handleLookup}
          className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-5 md:p-6 space-y-4 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25)]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Tracking code
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 20))}
                placeholder="EST-AB12CD"
                autoComplete="off"
                className="bg-secondary/40 border-white/5 h-12 rounded-xl font-mono tracking-wider"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last4" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Last 4 of phone
              </Label>
              <Input
                id="last4"
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                inputMode="numeric"
                autoComplete="off"
                className="bg-secondary/40 border-white/5 h-12 rounded-xl font-mono tracking-wider"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-heading uppercase tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Check status
              </>
            )}
          </Button>
        </form>

        {/* Result */}
        {notFound && (
          <div className="mt-6 rounded-2xl bg-rose-500/5 ring-1 ring-rose-500/30 p-5 text-sm">
            <p className="text-rose-300 font-medium mb-1">No request found</p>
            <p className="text-muted-foreground">
              Double-check the code and the last 4 digits of the phone you used. Still stuck? Text us on{" "}
              <a
                href="https://wa.me/17473706885"
                target="_blank"
                rel="noopener"
                className="text-primary underline-offset-2 hover:underline"
              >
                WhatsApp (747) 370-6885
              </a>
              .
            </p>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-5 md:p-6 space-y-5 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25)]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
                  Tracking code
                </div>
                <div className="font-mono text-lg text-primary tracking-wider">{result.public_code}</div>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full ring-1 px-3 py-1.5 text-xs font-medium ${
                  STATUS_LABELS[result.status]?.tone ?? "bg-secondary/60 text-foreground ring-border"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {STATUS_LABELS[result.status]?.label ?? result.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-t border-border pt-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
                  Service
                </div>
                <div className="text-foreground">{result.service_type}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
                  Direction
                </div>
                <div className="text-foreground capitalize">{result.service_direction}</div>
              </div>
              {result.preferred_date && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
                    Preferred date
                  </div>
                  <div className="text-foreground">{formatPreferredDate(result.preferred_date)}</div>
                </div>
              )}
              {result.preferred_time && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
                    Preferred time
                  </div>
                  <div className="text-foreground">{result.preferred_time}</div>
                </div>
              )}
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
                  Submitted
                </div>
                <div className="text-foreground">{formatDate(result.created_at)}</div>
              </div>
            </div>


            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <Button
                asChild
                variant="outline"
                className="flex-1 h-11 rounded-xl border-primary/30 hover:bg-primary/10"
              >
                <a href="https://wa.me/17473706885" target="_blank" rel="noopener">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp the team
                </a>
              </Button>
              <Button asChild className="flex-1 h-11 rounded-xl">
                <a href={`mailto:support@autobais.app?subject=Request%20${result.public_code}`}>
                  Email about this request
                </a>
              </Button>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          For privacy, we only show status info — not personal details. Need to update your request?{" "}
          <a
            href="https://wa.me/17473706885"
            target="_blank"
            rel="noopener"
            className="text-primary hover:underline"
          >
            Text us
          </a>
          .
        </p>
      </div>
    </main>
  );
};

export default RequestStatus;
