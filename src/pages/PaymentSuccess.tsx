import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  Receipt,
  Download,
  Printer,
  Mail,
  Check,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  Lock,
  ShieldCheck,
} from "lucide-react";
import CTAButton from "@/components/CTAButton";
import { supabase } from "@/integrations/supabase/client";
import { downloadReceipt, printReceipt } from "@/lib/receiptPdf";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type LineItem = {
  name: string;
  description: string | null;
  quantity: number;
  amount_total: number; // cents
  amount_subtotal: number;
};

type SessionSummary = {
  id: string;
  payment_intent: string | null;
  created: number | null;
  status: string | null;
  payment_status: string | null;
  amount_total: number;
  amount_subtotal: number;
  total_discount: number;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  metadata: Record<string, string>;
  line_items: LineItem[];
};

const formatCents = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);

const todayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatLongDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const paymentToken = params.get("t") ?? params.get("payment_token") ?? "";
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(!!sessionId);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Delivery details form state
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [confirmingRoute, setConfirmingRoute] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    document.title = "Payment Confirmed · PICKUP HAUL";
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const tokenQs = paymentToken ? `&payment_token=${encodeURIComponent(paymentToken)}` : "";
        const { data, error: fnError } = await supabase.functions.invoke(
          `get-checkout-session?session_id=${encodeURIComponent(sessionId)}${tokenQs}`,
          { method: "GET" },
        );
        if (fnError) throw fnError;
        if (!cancelled) setSummary(data as SessionSummary);
      } catch (err) {
        console.error("get-checkout-session error:", err);
        if (!cancelled) setError("Could not load order summary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Auto-send receipt once when the summary first loads (idempotency key dedupes server-side)
  useEffect(() => {
    if (summary && summary.customer_email && !emailSent && !emailSending) {
      handleEmailReceipt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  // Split line items into the main package and add-ons
  const mainItem = summary?.line_items.find((li) => !li.name.toLowerCase().startsWith("add-on:"));
  const addOnItems = summary?.line_items.filter((li) => li.name.toLowerCase().startsWith("add-on:")) ?? [];

  // Delivery details from session metadata
  const deliveryMeta = useMemo(() => {
    const m = summary?.metadata ?? {};
    return {
      pickup_address: m.pickup_address ?? null,
      dropoff_address: m.dropoff_address ?? null,
      delivery_date: m.delivery_date ?? null,
      delivery_time: m.delivery_time ?? null,
    };
  }, [summary]);

  const hasDeliveryDetails = Boolean(
    deliveryMeta.pickup_address &&
      deliveryMeta.dropoff_address &&
      deliveryMeta.delivery_date &&
      deliveryMeta.delivery_time,
  );

  const routeConfirmedAt = summary?.metadata?.route_confirmed_at ?? null;
  const routeConfirmed = Boolean(routeConfirmedAt);
  const showForm = !routeConfirmed && (!hasDeliveryDetails || isEditing);

  // Order date from Stripe session (created timestamp, seconds)
  const orderDateStr = useMemo(() => {
    if (!summary?.created) return null;
    return new Date(summary.created * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [summary]);

  // Prefill form from existing metadata when summary first loads
  useEffect(() => {
    if (!summary) return;
    setPickupAddress((p) => p || deliveryMeta.pickup_address || "");
    setDropoffAddress((p) => p || deliveryMeta.dropoff_address || "");
    setDeliveryDate((p) => p || deliveryMeta.delivery_date || "");
    setDeliveryTime((p) => p || deliveryMeta.delivery_time || "");
  }, [summary, deliveryMeta]);

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) return;

    const pickup = pickupAddress.trim();
    const dropoff = dropoffAddress.trim();
    const date = deliveryDate.trim();
    const time = deliveryTime.trim();

    if (pickup.length < 5 || pickup.length > 250) {
      toast.error("Pickup address must be between 5 and 250 characters.");
      return;
    }
    if (dropoff.length < 5 || dropoff.length > 250) {
      toast.error("Dropoff address must be between 5 and 250 characters.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Please pick a valid delivery date.");
      return;
    }
    if (date < todayIso()) {
      toast.error("Delivery date cannot be in the past.");
      return;
    }
    if (time.length < 1 || time.length > 60) {
      toast.error("Please enter an expected time window.");
      return;
    }

    setSavingDetails(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "update-checkout-session-details",
        {
          body: {
            session_id: summary.id,
            payment_token: paymentToken,
            pickup_address: pickup,
            dropoff_address: dropoff,
            delivery_date: date,
            delivery_time: time,
          },
        },
      );
      if (fnError) throw fnError;
      const newMeta = (data as { metadata?: Record<string, string> })?.metadata ?? {};
      setSummary((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, ...newMeta } } : prev,
      );
      toast.success("Delivery details saved.");
      setIsEditing(false);
    } catch (err) {
      console.error("save delivery error:", err);
      toast.error("Could not save delivery details. Please try again.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleConfirmRoute = async () => {
    if (!summary) return;
    setConfirmingRoute(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "update-checkout-session-details",
        {
          body: {
            session_id: summary.id,
            payment_token: paymentToken,
            confirm: true,
          },
        },
      );
      if (fnError) throw fnError;
      const newMeta = (data as { metadata?: Record<string, string> })?.metadata ?? {};
      setSummary((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, ...newMeta } } : prev,
      );
      setConfirmDialogOpen(false);
      setIsEditing(false);
      toast.success("Route confirmed and locked.");
    } catch (err) {
      console.error("confirm route error:", err);
      toast.error("Could not confirm route. Please try again.");
    } finally {
      setConfirmingRoute(false);
    }
  };


  const handleEmailReceipt = async () => {
    if (!summary || !summary.customer_email) {
      toast.error("No customer email on this order.");
      return;
    }
    setEmailSending(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "payment-receipt",
          recipientEmail: summary.customer_email,
          idempotencyKey: `receipt-${summary.id}`,
          templateData: {
            name: summary.customer_name ?? undefined,
            receiptId: summary.id,
            currency: summary.currency,
            amount_total: summary.amount_total,
            total_discount: summary.total_discount,
            line_items: summary.line_items.map((li) => ({
              name: li.name,
              quantity: li.quantity,
              amount_total: li.amount_total,
            })),
            customer_email: summary.customer_email,
            customer_phone: summary.customer_phone ?? undefined,
            paid_at: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          },
        },
      });
      if (fnError) throw fnError;
      setEmailSent(true);
      toast.success(`Receipt sent to ${summary.customer_email}`);
    } catch (err) {
      console.error("send receipt error:", err);
      toast.error("Could not send receipt. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-primary/15 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-xl w-full glass rounded-3xl p-8 md:p-10 text-center space-y-6">
        <div className="inline-flex size-16 rounded-2xl bg-primary/15 items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Payment <span className="text-gradient-primary">Confirmed</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm">
            Thanks for choosing PICKUP HAUL. We'll reach out shortly to confirm the schedule.
            A receipt has been sent to your email.
          </p>
        </div>

        {/* Order summary */}
        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading order summary…
          </div>
        )}

        {!loading && summary && (
          <div className="text-left glass-subtle rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-primary font-semibold">
              <Receipt className="h-3.5 w-3.5" />
              Order Summary
            </div>

            {mainItem && (
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold tracking-tight truncate">
                    {mainItem.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Qty {mainItem.quantity}</div>
                </div>
                <div className="text-sm font-medium tabular-nums shrink-0">
                  {formatCents(mainItem.amount_total, summary.currency)}
                </div>
              </div>
            )}

            {addOnItems.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/80">
                  Add-ons
                </div>
                {addOnItems.map((li, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground/85 truncate">
                      {li.name.replace(/^add-on:\s*/i, "")}
                    </span>
                    <span className="tabular-nums text-primary font-medium shrink-0">
                      +{formatCents(li.amount_total, summary.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {summary.total_discount > 0 && (
              <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
                <span className="text-muted-foreground">Promo discount</span>
                <span className="tabular-nums text-primary">
                  −{formatCents(summary.total_discount, summary.currency)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                Total paid
              </span>
              <span className="font-heading text-2xl font-semibold tabular-nums text-gradient-primary">
                {formatCents(summary.amount_total, summary.currency)}
              </span>
            </div>

            {(summary.customer_email || summary.customer_phone) && (
              <div className="pt-3 border-t border-white/5 space-y-1 text-[11px] text-muted-foreground">
                {summary.customer_name && <div>{summary.customer_name}</div>}
                {summary.customer_email && <div>{summary.customer_email}</div>}
                {summary.customer_phone && <div>{summary.customer_phone}</div>}
              </div>
            )}

            <div className="pt-3 border-t border-white/5 space-y-2">
              {orderDateStr && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Order date</span>
                  <span className="text-xs font-medium text-foreground text-right">
                    {orderDateStr}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Order #</span>
                <span className="text-xs font-mono font-semibold text-foreground break-all text-right">
                  {summary.payment_intent ?? summary.id}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Session</span>
                <span className="text-[10px] font-mono text-muted-foreground/70 break-all text-right">
                  {summary.id}
                </span>
              </div>
              <a
                href={`/payment-success?session_id=${encodeURIComponent(summary.id)}`}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                View receipt online →
              </a>
            </div>
          </div>
        )}

        {/* Delivery details: form when missing/editing, summary with confirm CTA, or locked when confirmed */}
        {!loading && summary && (
          <div className="text-left glass-subtle rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-primary font-semibold">
                <MapPin className="h-3.5 w-3.5" />
                Delivery Details
              </div>
              {routeConfirmed && (
                <div className="flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-primary font-semibold">
                  <Lock className="h-3 w-3" />
                  Locked
                </div>
              )}
            </div>

            {!showForm && hasDeliveryDetails && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Pickup
                    </div>
                    <div className="text-sm text-foreground/90 break-words">
                      {deliveryMeta.pickup_address}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Dropoff
                    </div>
                    <div className="text-sm text-foreground/90 break-words">
                      {deliveryMeta.dropoff_address}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" /> Delivery date
                    </div>
                    <div className="text-sm text-foreground/90">
                      {formatLongDate(deliveryMeta.delivery_date)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Expected time
                    </div>
                    <div className="text-sm text-foreground/90">
                      {deliveryMeta.delivery_time}
                    </div>
                  </div>
                </div>

                {routeConfirmed ? (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Route confirmed{routeConfirmedAt ? ` on ${new Date(routeConfirmedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}` : ""}.
                      Details are locked. Need a change? Call (747) 370-6885.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-subtle hover:border-primary/40 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDialogOpen(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Confirm route
                    </button>
                  </div>
                )}
              </>
            )}

            {showForm && (
              <form onSubmit={handleSaveDelivery} className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add the route and a preferred time so we can schedule your haul.
                  These details will appear on your receipt. After confirming, the
                  route will be locked.
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    Pickup address
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={250}
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="123 Main St, Los Angeles, CA"
                    className="w-full px-3 py-2 rounded-lg bg-background/40 border border-white/10 text-sm focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    Dropoff address
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={250}
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    placeholder="456 Oak Ave, Burbank, CA"
                    className="w-full px-3 py-2 rounded-lg bg-background/40 border border-white/10 text-sm focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Delivery date
                    </label>
                    <input
                      type="date"
                      required
                      min={todayIso()}
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-white/10 text-sm focus:outline-none focus:border-primary/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Expected time
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder="e.g. 9 AM – 12 PM"
                      className="w-full px-3 py-2 rounded-lg bg-background/40 border border-white/10 text-sm focus:outline-none focus:border-primary/60"
                    />
                  </div>
                </div>
                <div className={`grid ${isEditing && hasDeliveryDetails ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                  {isEditing && hasDeliveryDetails && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setPickupAddress(deliveryMeta.pickup_address || "");
                        setDropoffAddress(deliveryMeta.dropoff_address || "");
                        setDeliveryDate(deliveryMeta.delivery_date || "");
                        setDeliveryTime(deliveryMeta.delivery_time || "");
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-subtle hover:border-primary/40 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingDetails}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingDetails ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save delivery details"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm your route?</AlertDialogTitle>
              <AlertDialogDescription>
                Once confirmed, pickup, dropoff, delivery date and expected time
                will be locked and cannot be edited from this page. Need a later
                change? Call (747) 370-6885.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {hasDeliveryDetails && (
              <div className="rounded-xl glass-subtle p-3 text-xs space-y-1.5 text-left">
                <div><span className="text-muted-foreground">Pickup:</span> {deliveryMeta.pickup_address}</div>
                <div><span className="text-muted-foreground">Dropoff:</span> {deliveryMeta.dropoff_address}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatLongDate(deliveryMeta.delivery_date)}</div>
                <div><span className="text-muted-foreground">Time:</span> {deliveryMeta.delivery_time}</div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmingRoute}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmRoute();
                }}
                disabled={confirmingRoute}
              >
                {confirmingRoute ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Confirming…
                  </>
                ) : (
                  "Confirm & lock"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        {!loading && error && (
          <div className="text-xs text-muted-foreground glass-subtle rounded-xl p-3">
            {error} Your payment was still successful — we'll reach out by phone or email.
          </div>
        )}

        <div className="pt-2 space-y-3">
          {summary && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadReceipt({
                      ...summary,
                      receipt_url: `${window.location.origin}/payment-success?session_id=${encodeURIComponent(summary.id)}`,
                      order_date: orderDateStr,
                      pickup_address: deliveryMeta.pickup_address,
                      dropoff_address: deliveryMeta.dropoff_address,
                      delivery_date: deliveryMeta.delivery_date,
                      delivery_time: deliveryMeta.delivery_time,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-subtle hover:border-primary/40 text-sm font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printReceipt({
                      ...summary,
                      receipt_url: `${window.location.origin}/payment-success?session_id=${encodeURIComponent(summary.id)}`,
                      order_date: orderDateStr,
                      pickup_address: deliveryMeta.pickup_address,
                      dropoff_address: deliveryMeta.dropoff_address,
                      delivery_date: deliveryMeta.delivery_date,
                      delivery_time: deliveryMeta.delivery_time,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-subtle hover:border-primary/40 text-sm font-medium transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
              {summary.customer_email && (
                <button
                  type="button"
                  onClick={handleEmailReceipt}
                  disabled={emailSending || emailSent}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-subtle hover:border-primary/40 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : emailSent ? (
                    <>
                      <Check className="h-4 w-4 text-primary" />
                      Receipt sent to {summary.customer_email}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Email receipt to {summary.customer_email}
                    </>
                  )}
                </button>
              )}
            </>
          )}
          <CTAButton href="tel:+17473706885" variant="primary" size="md" icon="phone" className="w-full">
            Call (747) 370-6885
          </CTAButton>
          <Link
            to="/"
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
};

export default PaymentSuccess;
