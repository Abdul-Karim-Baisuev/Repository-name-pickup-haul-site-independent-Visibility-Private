import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
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

type Order = {
  public_code: string;
  tracking_token: string;
  service_type: string;
  service_direction: string;
  preferred_date: string | null;
  preferred_time: string | null;
  destination_summary: string | null;
  status: string;
  payment_status: string;
  final_price_cents: number | null;
  deposit_amount_cents: number | null;
  balance_due_cents: number | null;
  payable_token: string | null;
  payable_link_type: "deposit" | "full" | "balance" | null;
  paid_at: string | null;
  created_at: string;
};

const lookupSchema = z.object({
  email: z.string().trim().email("Enter the email you used to book").max(254),
  last4: z.string().trim().regex(/^\d{4}$/, "Enter the last 4 digits of your phone"),
});

const STATUS_TONE: Record<string, { label: string; tone: string }> = {
  new: { label: "Received", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  in_progress: { label: "In progress", tone: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
  done: { label: "Completed", tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  canceled: { label: "Canceled", tone: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
};

const PAYMENT_TONE: Record<string, { label: string; tone: string }> = {
  unpaid: { label: "Awaiting payment", tone: "bg-secondary/60 text-foreground/80 ring-border" },
  deposit_pending: { label: "Deposit pending", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  deposit_paid: { label: "Deposit paid", tone: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
  full_pending: { label: "Payment pending", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  paid: { label: "Paid in full", tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  balance_pending: { label: "Balance pending", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  refunded: { label: "Refunded", tone: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
  failed: { label: "Payment failed", tone: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
};

const fmtUsd = (c: number | null | undefined) =>
  c == null ? null : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const directionLabel = (d: string) =>
  d === "pickup" ? "Pickup only" : d === "dropoff" ? "Dropoff only" : "Pickup + Dropoff";

const Portal = () => {
  const [email, setEmail] = useState("");
  const [last4, setLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("pickuphaul_portal_email");
      if (savedEmail) setEmail(savedEmail);
    } catch { /* noop */ }
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = lookupSchema.safeParse({ email, last4 });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    const normEmail = parsed.data.email.toLowerCase();

    const lock = checkLockout("code", `portal:${normEmail}`);
    if (lock.locked) {
      toast.error("Too many attempts", {
        description: `For your security, please try again in ${formatRetry(lock.retryInSec)}.`,
      });
      return;
    }

    setLoading(true);
    setOrders(null);
    const { data, error } = await supabase.rpc("get_customer_orders", {
      _email: normEmail,
      _phone_last4: parsed.data.last4,
    });
    setLoading(false);

    if (error) {
      const isRate = error.message?.includes("rate_limited");
      if (isRate) recordFailure("code", `portal:${normEmail}`);
      toast.error(isRate ? "Too many attempts" : "Could not load your orders", {
        description: isRate
          ? "Please try again in a few minutes."
          : "Please try again or text us at (747) 370-6885.",
      });
      return;
    }

    const rows = (data ?? []) as Order[];
    if (rows.length === 0) {
      const next = recordFailure("code", `portal:${normEmail}`);
      setOrders([]);
      if (next.locked) {
        toast.error("Too many attempts", {
          description: `Please try again in ${formatRetry(next.retryInSec)}.`,
        });
      } else if (next.remaining <= 2) {
        toast.warning(`${next.remaining} attempts left before a temporary lockout.`);
      }
      return;
    }

    recordSuccess("code", `portal:${normEmail}`);
    try { localStorage.setItem("pickuphaul_portal_email", normEmail); } catch { /* noop */ }
    setOrders(rows);
  };

  const handlePay = async (order: Order) => {
    if (!order.payable_token || !order.payable_link_type) return;
    setPaying(order.public_code);
    const win = window.open("about:blank", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("create-estimate-payment", {
        body: { token: order.payable_token, linkType: order.payable_link_type },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("No checkout URL returned");
      if (win && !win.closed) win.location.href = url;
      else window.location.href = url;
    } catch (err) {
      console.error("portal pay error:", err);
      if (win && !win.closed) win.close();
      toast.error("Could not start checkout", {
        description: "Please try again or text dispatch at (747) 370-6885.",
      });
    } finally {
      setPaying(null);
    }
  };

  const summary = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    const paid = orders.filter((o) => o.payment_status === "paid").length;
    const open = orders.length - paid;
    return { paid, open, total: orders.length };
  }, [orders]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEO
        title="My Orders · PICKUP HAUL Portal"
        description="Secure customer portal for PICKUP HAUL: view your requests, estimate amounts, payment status, tracking and pay deposits or balances in one place."
        canonical="https://www.autobais.app/portal"
      />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-10 md:py-16">
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
            Customer portal
          </div>
          <h1 className="font-heading text-4xl md:text-5xl uppercase tracking-tight">
            Your <span className="text-gradient-primary">Orders</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Look up every request you've made with PICKUP HAUL — status, route, agreed price, payment and live tracking, all in one place.
            We verify your identity with your email and the last 4 digits of your phone.
          </p>
        </div>

        {/* Lookup form */}
        <form
          onSubmit={handleLookup}
          className="rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-5 md:p-6 space-y-4 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.25)]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Email used to book
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 254))}
                placeholder="you@example.com"
                autoComplete="email"
                className="bg-secondary/40 border-white/5 h-12 rounded-xl"
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
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</>
            ) : (
              <><Search className="h-4 w-4 mr-2" /> Open my orders</>
            )}
          </Button>
        </form>

        {/* Empty result */}
        {orders && orders.length === 0 && (
          <div className="mt-6 rounded-2xl bg-rose-500/5 ring-1 ring-rose-500/30 p-5 text-sm">
            <p className="text-rose-300 font-medium mb-1">No matching orders</p>
            <p className="text-muted-foreground">
              Double-check the email and the last 4 digits of the phone you used. New here?{" "}
              <Link to="/quote" className="text-primary hover:underline">Request your first quote</Link>.
            </p>
          </div>
        )}

        {/* Summary strip */}
        {summary && (
          <div className="mt-8 grid grid-cols-3 gap-3">
            <SummaryStat label="Total" value={summary.total} icon={<Sparkles className="h-3.5 w-3.5" />} />
            <SummaryStat label="Paid" value={summary.paid} icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />} />
            <SummaryStat label="Open" value={summary.open} icon={<Clock className="h-3.5 w-3.5 text-amber-300" />} />
          </div>
        )}

        {/* Orders list */}
        {orders && orders.length > 0 && (
          <div className="mt-6 space-y-4">
            {orders.map((o) => {
              const statusMeta = STATUS_TONE[o.status] ?? { label: o.status, tone: "bg-secondary/60 text-foreground ring-border" };
              const payMeta = PAYMENT_TONE[o.payment_status] ?? { label: o.payment_status, tone: "bg-secondary/60 text-foreground ring-border" };
              const showFinal = (o.final_price_cents ?? 0) > 0;
              const showDeposit = (o.deposit_amount_cents ?? 0) > 0;
              const showBalance = (o.balance_due_cents ?? 0) > 0 && o.payment_status !== "paid";
              const payLabel =
                o.payable_link_type === "deposit"
                  ? `Pay deposit · ${fmtUsd(o.deposit_amount_cents)}`
                  : o.payable_link_type === "full"
                    ? `Pay in full · ${fmtUsd(o.final_price_cents)}`
                    : o.payable_link_type === "balance"
                      ? `Pay balance · ${fmtUsd(o.balance_due_cents)}`
                      : null;

              return (
                <article
                  key={o.public_code}
                  className="group relative overflow-hidden rounded-2xl bg-card/60 ring-1 ring-border backdrop-blur-xl p-5 md:p-6 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.2)] transition-shadow hover:shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.35)]"
                >
                  <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none opacity-60" />

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
                        Order
                      </div>
                      <div className="font-mono text-lg text-primary tracking-wider">{o.public_code}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <span className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-[11px] font-medium ${statusMeta.tone}`}>
                        <Clock className="h-3 w-3" /> {statusMeta.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-[11px] font-medium ${payMeta.tone}`}>
                        <CreditCard className="h-3 w-3" /> {payMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Service + route */}
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/60 pt-4">
                    <div className="flex items-start gap-3">
                      <div className="size-9 shrink-0 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Service</div>
                        <div className="text-sm text-foreground font-medium truncate">{o.service_type}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{directionLabel(o.service_direction)}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="size-9 shrink-0 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Destination area</div>
                        <div className="text-sm text-foreground truncate">{o.destination_summary ?? "—"}</div>
                        {o.preferred_date && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {fmtDate(o.preferred_date)}
                            {o.preferred_time ? ` · ${o.preferred_time}` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amounts */}
                  {(showFinal || showDeposit || showBalance || o.paid_at) && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/60 pt-4">
                      {showFinal && (
                        <Amount label="Estimate" value={fmtUsd(o.final_price_cents)} accent />
                      )}
                      {showDeposit && (
                        <Amount label="Deposit" value={fmtUsd(o.deposit_amount_cents)} />
                      )}
                      {showBalance && (
                        <Amount label="Balance due" value={fmtUsd(o.balance_due_cents)} />
                      )}
                      {o.paid_at && (
                        <Amount label="Paid on" value={fmtDate(o.paid_at) ?? "—"} />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex flex-col sm:flex-row gap-2 border-t border-border/60 pt-4">
                    {payLabel && o.payable_token && (
                      <Button
                        onClick={() => handlePay(o)}
                        disabled={paying === o.public_code}
                        className="flex-1 h-11 rounded-xl font-heading uppercase tracking-wider"
                      >
                        {paying === o.public_code ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening…</>
                        ) : (
                          <><CreditCard className="h-4 w-4 mr-2" /> {payLabel}</>
                        )}
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 h-11 rounded-xl border-primary/30 hover:bg-primary/10"
                    >
                      <Link to={`/track/${o.tracking_token}`}>
                        <Navigation className="h-4 w-4 mr-2" />
                        Live tracking
                        <ArrowRight className="h-3.5 w-3.5 ml-2 opacity-70" />
                      </Link>
                    </Button>
                  </div>

                  {o.payment_status === "paid" && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 px-3 py-1.5 text-[11px] text-emerald-300 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Payment confirmed by Stripe
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-[11px] text-muted-foreground">
          Need help? Text dispatch on{" "}
          <a href="https://wa.me/17473706885" target="_blank" rel="noopener" className="text-primary hover:underline">
            WhatsApp (747) 370-6885
          </a>
          . We never ask for card details over text.
        </p>
      </div>
    </main>
  );
};

const SummaryStat = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-2xl bg-card/50 ring-1 ring-border backdrop-blur-xl p-4 text-center">
    <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      {icon} {label}
    </div>
    <div className="mt-1 font-heading text-2xl tabular-nums">{value}</div>
  </div>
);

const Amount = ({ label, value, accent }: { label: string; value: string | null; accent?: boolean }) => (
  <div>
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    <div className={`text-sm font-semibold tabular-nums ${accent ? "text-gradient-primary text-base" : "text-foreground"}`}>
      {value ?? "—"}
    </div>
  </div>
);

export default Portal;
