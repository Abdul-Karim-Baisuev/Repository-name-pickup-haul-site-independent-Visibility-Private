import { useMemo, useState } from "react";
import { Loader2, Check, ShieldCheck, Star, Zap, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CTAButton from "@/components/CTAButton";
import { servicePackages, type ServicePackage } from "@/data/servicePackages";

const categories = ["Hauling", "Assemble & Install"] as const;

type SelectedAddOns = Record<string, Set<string>>; // pkgId -> set of addon ids

const ServicePackagesSection = () => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedAddOns>({});

  const toggleAddOn = (pkgId: string, addOnId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      const current = new Set(next[pkgId] ?? []);
      if (current.has(addOnId)) current.delete(addOnId);
      else current.add(addOnId);
      next[pkgId] = current;
      return next;
    });
  };

  const computeTotal = (pkg: ServicePackage) => {
    const addOns = pkg.addOns ?? [];
    const chosen = selected[pkg.id] ?? new Set<string>();
    const extra = addOns
      .filter((a) => chosen.has(a.id))
      .reduce((sum, a) => sum + a.price, 0);
    return pkg.price + extra;
  };

  const handlePay = async (pkg: ServicePackage) => {
    setLoadingId(pkg.id);
    // Open a blank tab synchronously to avoid mobile popup blockers.
    // We'll set its location once the checkout URL arrives.
    const checkoutWindow = window.open("about:blank", "_blank");
    try {
      const chosen = selected[pkg.id] ?? new Set<string>();
      const addOnsPayload = (pkg.addOns ?? [])
        .filter((a) => chosen.has(a.id))
        .map((a) => ({ id: a.id, label: a.label, price: a.price }));

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { mode: "package", priceId: pkg.priceId, addOns: addOnsPayload },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.location.href = data.url;
      } else {
        // Popup was blocked — navigate current tab as a reliable fallback.
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("create-payment error:", err);
      if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
      toast.error("Could not start checkout", {
        description: "Please try again or call (747) 370-6885.",
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section id="packages" className="relative py-28 md:py-36 overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-primary/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[400px] bg-[hsl(35_80%_50%)]/10 rounded-full blur-[140px]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-3xl mb-10 md:mb-14 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
              Book & Pay Online
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold leading-[0.95] tracking-tight text-balance">
            Fixed-price <span className="text-gradient-primary">packages</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground font-light max-w-2xl leading-relaxed">
            Pay upfront for common jobs. Standard conditions: customer on-site and ready,
            normal access (parking, elevator), no extra delays from the customer side.
            Custom or larger jobs — get a quote and pay a 40% deposit below.
          </p>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-foreground/80">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Insured $1M / $2M
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-foreground/80">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Same-day available
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-foreground/80">
              <Star className="h-3.5 w-3.5 text-primary fill-primary" />
              5★ rated locally
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-foreground/80">
              <Check className="h-3.5 w-3.5 text-primary" />
              Free cancellation 24h
            </div>
          </div>
        </div>

        {categories.map((category) => {
          const items = servicePackages.filter((p) => p.category === category);
          return (
            <div key={category} className="mb-16 last:mb-0">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="font-heading text-xs tracking-[0.3em] uppercase text-primary">
                  {category}
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/40 via-white/10 to-transparent" />
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {items.map((pkg) => {
                  const isLoading = loadingId === pkg.id;
                  const total = computeTotal(pkg);
                  const chosen = selected[pkg.id] ?? new Set<string>();
                  const hasAddOns = (pkg.addOns?.length ?? 0) > 0;
                  return (
                    <div
                      key={pkg.id}
                      className={`group relative glass rounded-3xl p-6 md:p-7 flex flex-col hover:-translate-y-1 transition-all duration-500 overflow-hidden ${
                        pkg.popular ? "border-primary/40 shadow-glow" : ""
                      }`}
                    >
                      {pkg.popular && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                        </>
                      )}

                      <div className="relative flex items-center justify-between mb-6">
                        <div className="size-11 rounded-xl glass-subtle flex items-center justify-center group-hover:border-primary/40 transition-colors">
                          <pkg.icon className="h-5 w-5 text-primary" />
                        </div>
                        {pkg.badge && (
                          <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30">
                            {pkg.badge}
                          </span>
                        )}
                      </div>

                      <div className="relative space-y-2 mb-5">
                        <h4 className="text-xl font-semibold tracking-tight">{pkg.name}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {pkg.description}
                        </p>
                      </div>

                      <div className="relative mb-5 pb-5 border-b border-white/5">
                        <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/80 font-medium mb-1">
                          {chosen.size > 0 ? "Total with add-ons" : "Flat rate"}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-heading text-4xl font-semibold tabular-nums tracking-tight">
                            ${total}
                          </span>
                          <span className="text-xs text-muted-foreground">USD</span>
                          {chosen.size > 0 && (
                            <span className="text-[11px] text-muted-foreground line-through ml-auto">
                              ${pkg.price}
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="relative space-y-2.5 mb-5 flex-1">
                        {pkg.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="text-xs text-foreground/85 leading-snug">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {hasAddOns && (
                        <div className="relative mb-5 pt-4 border-t border-white/5">
                          <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/80 font-medium mb-2.5 flex items-center gap-1.5">
                            <Plus className="h-3 w-3" />
                            Add-ons
                          </div>
                          <div className="space-y-1.5">
                            {pkg.addOns!.map((addOn) => {
                              const active = chosen.has(addOn.id);
                              return (
                                <button
                                  key={addOn.id}
                                  type="button"
                                  onClick={() => toggleAddOn(pkg.id, addOn.id)}
                                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors text-left ${
                                    active
                                      ? "bg-primary/15 border border-primary/40 text-foreground"
                                      : "glass-subtle hover:border-primary/30 text-foreground/85"
                                  }`}
                                >
                                  <span className="inline-flex items-center gap-2 min-w-0">
                                    <span
                                      className={`size-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${
                                        active ? "bg-primary border-primary" : "border-white/25"
                                      }`}
                                    >
                                      {active && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                                    </span>
                                    <span className="truncate">{addOn.label}</span>
                                  </span>
                                  <span className="tabular-nums text-primary font-medium shrink-0">
                                    +${addOn.price}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <CTAButton
                        as="button"
                        type="button"
                        onClick={() => handlePay(pkg)}
                        disabled={isLoading}
                        variant={pkg.popular ? "primary" : "secondary"}
                        size="md"
                        icon={isLoading ? "none" : "arrow"}
                        className="relative w-full"
                      >
                        {isLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Redirecting…
                          </span>
                        ) : (
                          `Pay $${total}`
                        )}
                      </CTAButton>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="mt-12 flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Secure checkout by Stripe · Cards, Apple Pay, Google Pay</span>
          </div>
          <div>Promo code? Apply it at checkout.</div>
        </div>
      </div>
    </section>
  );
};

export default ServicePackagesSection;
