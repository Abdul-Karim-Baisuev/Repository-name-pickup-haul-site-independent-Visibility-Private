import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import CTAButton from "@/components/CTAButton";
import { supabase } from "@/integrations/supabase/client";

type LinkType = "deposit" | "full" | "balance";

interface PayInfo {
  public_code: string;
  service_type: string;
  address: string;
  payment_status: string;
  final_price_cents: number | null;
  deposit_amount_cents: number | null;
  balance_due_cents: number | null;
  last_payment_link_type: LinkType | null;
}

const fmt = (c: number | null | undefined) =>
  c == null ? "—" : `$${(c / 100).toFixed(2)}`;

const PayByTokenPage = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingType, setPayingType] = useState<LinkType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Edge function expects ?token= — invoke doesn't pass query params; call directly.
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-estimate-payment?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          },
        });
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json?.error ?? "Payment link not available.");
          return;
        }
        if (!cancelled) setInfo(json as PayInfo);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load payment details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const startCheckout = async (linkType: LinkType) => {
    setPayingType(linkType);
    const w = window.open("about:blank", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("create-estimate-payment", {
        body: { token, linkType },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL");
      if (w && !w.closed) w.location.href = data.url;
      else window.location.href = data.url;
    } catch (e) {
      console.error(e);
      if (w && !w.closed) w.close();
      toast.error("Could not start checkout", {
        description: e instanceof Error ? e.message : "Please call (747) 370-6885.",
      });
    } finally {
      setPayingType(null);
    }
  };

  // Decide which buttons to show: rely on admin's chosen `last_payment_link_type`,
  // and on which amounts are configured. We never let the user pick anything
  // that isn't pre-approved by the admin.
  const showDeposit =
    info?.last_payment_link_type === "deposit" &&
    !!info.deposit_amount_cents &&
    info.payment_status !== "paid" &&
    info.payment_status !== "deposit_paid";
  const showFull =
    info?.last_payment_link_type === "full" &&
    !!info.final_price_cents &&
    info.payment_status !== "paid";
  const showBalance =
    info?.last_payment_link_type === "balance" &&
    !!info.balance_due_cents &&
    info.payment_status !== "paid";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pay your invoice · PICKUP HAUL"
        description="Secure Stripe payment for your confirmed PICKUP HAUL estimate."
        canonical="https://www.autobais.app/pay"
      />
      <Navbar />
      <main className="pt-24 pb-24">
        <section className="container mx-auto px-6">
          <div className="max-w-xl mx-auto glass rounded-3xl p-6 md:p-10 space-y-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
                  Confirmed Estimate
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                Secure <span className="text-gradient-primary">payment</span>
              </h1>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                {error}
              </div>
            ) : info ? (
              <>
                <div className="rounded-2xl glass-subtle p-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code</span>
                    <span className="font-mono">{info.public_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span>{info.service_type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground/80 pt-2 border-t border-white/5">
                    {info.address}
                  </div>
                </div>

                <div className="rounded-2xl glass-subtle p-5 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Total
                    </div>
                    <div className="font-heading text-xl tabular-nums">
                      {fmt(info.final_price_cents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Deposit
                    </div>
                    <div className="font-heading text-xl tabular-nums">
                      {fmt(info.deposit_amount_cents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Balance
                    </div>
                    <div className="font-heading text-xl tabular-nums">
                      {fmt(info.balance_due_cents)}
                    </div>
                  </div>
                </div>

                {info.payment_status === "paid" ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-300">
                    This estimate is fully paid. Thank you!
                  </div>
                ) : !showDeposit && !showFull && !showBalance ? (
                  <div className="rounded-xl border border-border bg-card/40 p-4 text-center text-sm text-muted-foreground">
                    No payment is currently due. Please contact us at (747) 370-6885.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {showDeposit && (
                      <CTAButton
                        as="button"
                        type="button"
                        onClick={() => startCheckout("deposit")}
                        disabled={payingType !== null}
                        variant="primary"
                        size="md"
                        icon={payingType === "deposit" ? "none" : "arrow"}
                        className="w-full"
                      >
                        {payingType === "deposit" ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                          </span>
                        ) : (
                          `Pay deposit · ${fmt(info.deposit_amount_cents)}`
                        )}
                      </CTAButton>
                    )}
                    {showFull && (
                      <CTAButton
                        as="button"
                        type="button"
                        onClick={() => startCheckout("full")}
                        disabled={payingType !== null}
                        variant="primary"
                        size="md"
                        icon={payingType === "full" ? "none" : "arrow"}
                        className="w-full"
                      >
                        {payingType === "full" ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                          </span>
                        ) : (
                          `Pay in full · ${fmt(info.final_price_cents)}`
                        )}
                      </CTAButton>
                    )}
                    {showBalance && (
                      <CTAButton
                        as="button"
                        type="button"
                        onClick={() => startCheckout("balance")}
                        disabled={payingType !== null}
                        variant="primary"
                        size="md"
                        icon={payingType === "balance" ? "none" : "arrow"}
                        className="w-full"
                      >
                        {payingType === "balance" ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                          </span>
                        ) : (
                          `Pay final balance · ${fmt(info.balance_due_cents)}`
                        )}
                      </CTAButton>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Secure checkout by Stripe · Cards, Apple Pay, Google Pay</span>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PayByTokenPage;
