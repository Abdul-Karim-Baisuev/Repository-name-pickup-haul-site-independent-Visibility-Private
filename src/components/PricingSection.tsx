import { Truck, Package, Hammer, Check, Route } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import QuoteForm from "@/components/quote/QuoteForm";
import { useQuoteDialog } from "@/components/quote/QuoteDialogContext";

const pricingPlans = [
  {
    name: "Moving",
    icon: Package,
    price: "$89",
    unit: "starting price",
    description: "Small moves, furniture, appliances, and boxes",
    features: [
      "Includes loading & unloading",
      "Local hauls up to 20 miles",
      "Furniture blankets & tie-downs",
      "Same-day service available",
    ],
    popular: false,
  },
  {
    name: "Junk Removal",
    icon: Truck,
    price: "$129",
    unit: "starting price",
    description: "Garage cleanouts, yard waste, and bulky items",
    features: [
      "Truck-load pricing available",
      "We handle the heavy lifting",
      "Responsible disposal & recycling",
      "Dump fees quoted upfront",
    ],
    popular: true,
  },
  {
    name: "Construction",
    icon: Hammer,
    price: "$149",
    unit: "starting price",
    description: "Materials, supplies, debris, and job site hauls",
    features: [
      "Heavy-duty hauling capacity",
      "Materials pickup from suppliers",
      "Job site delivery",
      "Repeat hauls discount",
    ],
    popular: false,
  },
  {
    name: "Transport Only",
    icon: Route,
    price: "$5",
    unit: "per mile",
    description: "Best when your items are already loaded",
    features: [
      "No loading/unloading by us",
      "You pack the truck yourself",
      "Point A to Point B delivery",
      "Simple mileage-based rate",
    ],
    popular: false,
  },
];

const PricingSection = () => {
  const { open: openQuote } = useQuoteDialog();

  return (
    <section id="pricing" className="relative py-28 md:py-36 overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[500px] bg-primary/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-[hsl(346_80%_40%)]/10 rounded-full blur-[140px]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-3xl mb-16 md:mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
              Transparent Pricing
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold leading-[0.95] tracking-tight text-balance">
            Clear rates.<br />
            <span className="text-gradient-primary">No surprises.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground font-light max-w-xl leading-relaxed">
            Upfront estimates before we roll. Final price depends on distance, item size,
            and disposal fees.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {pricingPlans.map((plan, idx) => (
            <div
              key={idx}
              className={`group relative glass rounded-3xl p-7 md:p-8 flex flex-col hover:-translate-y-1 transition-all duration-500 overflow-hidden ${
                plan.popular ? "border-primary/40 shadow-glow" : ""
              }`}
            >
              {plan.popular && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                </>
              )}

              <div className="relative flex items-center justify-between mb-8">
                <div className="size-12 rounded-xl glass-subtle flex items-center justify-center group-hover:border-primary/40 transition-colors">
                  <plan.icon className="h-5 w-5 text-primary" />
                </div>
                {plan.popular && (
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30">
                    Popular
                  </span>
                )}
              </div>

              <div className="relative space-y-2 mb-6">
                <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="relative mb-8 pb-6 border-b border-white/5">
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/80 font-medium mb-1">
                  From
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-5xl font-semibold tabular-nums tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground">{plan.unit}</span>
                </div>
              </div>

              <ul className="relative space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/85 leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              <CTAButton
                as="button"
                onClick={openQuote}
                variant={plan.popular ? "primary" : "secondary"}
                size="md"
                icon="arrow"
                className="relative w-full"
              >
                Request Estimate
              </CTAButton>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto font-light">
            Need multiple loads, stairs, extra-heavy items, or a long-distance haul?{" "}
            <a href="tel:+17473706885" className="text-primary font-medium hover:underline">
              Call for an exact quote.
            </a>
          </p>
        </div>

        <div id="quote" className="mt-16 max-w-5xl mx-auto glass rounded-3xl p-6 md:p-10 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div className="space-y-3">
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                Instant Quote · Form 02
              </div>
              <h3 className="text-3xl md:text-4xl font-bold tracking-tight">
                Request <span className="text-gradient-primary">Estimate</span>
              </h3>
              <p className="text-sm text-muted-foreground font-light max-w-md">
                Send the job details and we'll confirm the exact price before dispatch.
              </p>
            </div>
            <div className="font-heading text-xs tracking-wider text-primary inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              FAST QUOTE
            </div>
          </div>

          <QuoteForm idPrefix="pricing-quote" />
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
