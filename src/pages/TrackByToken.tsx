import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";
import { BUSINESS_PHONE_TEL, BUSINESS_PHONE_DISPLAY } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";
import {
  checkLockout,
  recordFailure,
  recordSuccess,
  formatRetry,
} from "@/lib/trackingThrottle";

const tokenSchema = z
  .string()
  .trim()
  .min(20, "Invalid tracking link")
  .max(80, "Invalid tracking link")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid tracking link");

const last4Schema = z.string().trim().regex(/^\d{4}$/, "Enter the last 4 digits of your phone");

const TrackByToken = () => {
  const { token: rawToken } = useParams<{ token: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [last4, setLast4] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const parsed = tokenSchema.safeParse(rawToken ?? "");
    setToken(parsed.success ? parsed.data : null);
  }, [rawToken]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("This tracking link looks invalid.");
      return;
    }
    const parsed = last4Schema.safeParse(last4);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your input");
      return;
    }

    const lock = checkLockout("token", token);
    if (lock.locked) {
      toast.error("Too many attempts", {
        description: `For your security, please try again in ${formatRetry(lock.retryInSec)}.`,
      });
      return;
    }

    setVerifying(true);
    const { data, error } = await supabase.rpc("get_tracking_by_token", {
      _token: token,
      _phone_last4: parsed.data,
    });
    setVerifying(false);

    if (error) {
      const isRateLimit = error.message?.includes("rate_limited");
      if (isRateLimit) {
        recordFailure("token", token);
        toast.error("Too many attempts", {
          description: "Please try again later.",
        });
        return;
      }
      toast.error("Could not verify. Please try again.");
      return;
    }

    const row = Array.isArray(data) ? data[0] : undefined;
    if (!row) {
      const next = recordFailure("token", token);
      if (next.locked) {
        toast.error("Too many attempts", {
          description: `For your security, please try again in ${formatRetry(next.retryInSec)}.`,
        });
      } else {
        toast.error("Those details don't match", {
          description: `Check the link and your phone's last 4 digits. ${next.remaining} attempts left.`,
        });
      }
      return;
    }

    recordSuccess("token", token);
    setConfirmed(parsed.data);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEO
        title="Live Delivery Tracking | PICKUP HAUL"
        description="Track your PICKUP HAUL delivery in real time using your secure tracking link."
        canonical="https://www.autobais.app/track"
      />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-primary/15 blur-[140px]" />
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
            Secure tracking
          </div>
          <h1 className="font-heading text-3xl md:text-4xl uppercase tracking-tight">
            Your Delivery
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg">
            For your privacy, please confirm the last 4 digits of the phone number you used when booking.
          </p>
        </div>

        {!token && (
          <div className="rounded-2xl bg-rose-500/5 ring-1 ring-rose-500/30 p-5 text-sm">
            <p className="text-rose-300 font-medium mb-1">Invalid tracking link</p>
            <p className="text-muted-foreground">
              This link doesn't look right. Please use the exact tracking link we sent you, or text us on{" "}
              <a
                href="https://wa.me/17473706885"
                target="_blank"
                rel="noopener"
                className="text-primary hover:underline"
              >
                WhatsApp (747) 370-6885
              </a>
              .
            </p>
          </div>
        )}

        {token && !confirmed && (
          <form
            onSubmit={handleConfirm}
            className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-5 md:p-6 space-y-5 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25)]"
          >
            <div className="space-y-2">
              <Label htmlFor="last4" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Last 4 digits of your phone
              </Label>
              <Input
                id="last4"
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                autoComplete="one-time-code"
                aria-label="Last 4 digits of your phone number"
                className="bg-secondary/40 border-white/5 h-14 rounded-xl font-mono text-2xl tracking-[0.4em] text-center"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Use the same phone number you provided when booking.
              </p>
            </div>
            <Button
              type="submit"
              disabled={verifying}
              className="w-full h-12 rounded-xl font-heading uppercase tracking-wider"
            >
              {verifying ? "Verifying…" : "View live tracking"}
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl border-primary/30 hover:bg-primary/10"
            >
              <a href={BUSINESS_PHONE_TEL} aria-label={`Call AutoBais at ${BUSINESS_PHONE_DISPLAY}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call AutoBais {BUSINESS_PHONE_DISPLAY}
              </a>
            </Button>
          </form>
        )}

        {token && confirmed && (
          <div className="space-y-6">
            <LiveTrackingMap token={token} last4={confirmed} />

            <div className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-5 md:p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Need to update your delivery or speak to our team?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  asChild
                  className="w-full h-12 rounded-xl font-heading uppercase tracking-wider"
                >
                  <a href={BUSINESS_PHONE_TEL} aria-label={`Call AutoBais at ${BUSINESS_PHONE_DISPLAY}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call AutoBais
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-12 rounded-xl border-primary/30 hover:bg-primary/10"
                >
                  <a href="https://wa.me/17473706885" target="_blank" rel="noopener">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              For privacy, this page only shows your delivery status, the driver's first name, the truck, and the live
              location while the order is active. Personal details, the full address, and internal notes are never
              displayed publicly.
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default TrackByToken;
