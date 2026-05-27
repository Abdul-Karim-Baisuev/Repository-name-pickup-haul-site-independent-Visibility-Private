import QuoteForm from "@/components/quote/QuoteForm";

const QuoteSection = () => {
  return (
    <section
      id="quote"
      className="relative py-24 md:py-32 overflow-hidden"
      aria-labelledby="quote-heading"
    >
      {/* Aurora glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12 space-y-4">
          <span className="inline-block text-[10px] tracking-[0.3em] uppercase text-primary font-medium">
            Request a Quote
          </span>
          <h2
            id="quote-heading"
            className="font-heading text-4xl md:text-5xl lg:text-6xl uppercase tracking-tight text-foreground"
          >
            Tell us what to haul
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Pick your service, drop the addresses, choose a date — we review the details and
            reply with a confirmed estimate. No payment online.
          </p>
          <a
            href="/quote"
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-primary hover:text-primary/80 transition-colors"
          >
            Open full page →
          </a>
        </div>

        <div className="rounded-3xl border border-white/5 bg-secondary/20 backdrop-blur-xl p-6 md:p-10 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.15)]">
          <QuoteForm idPrefix="quote-section" />
        </div>
      </div>
    </section>
  );
};

export default QuoteSection;
