import { Clock, DollarSign, Shield, MapPin } from "lucide-react";
import ambientTacoma from "@/assets/ambient-tacoma-detail.jpg";

const advantages = [
  {
    icon: Clock,
    title: "Fast",
    value: "30 min",
    description: "Pickup window. No long waits, no hassle.",
  },
  {
    icon: DollarSign,
    title: "Affordable",
    value: "Flat-rate",
    description: "No hidden fees. Cheaper than a box truck.",
  },
  {
    icon: Shield,
    title: "Reliable",
    value: "$1M / $2M",
    description: "Fully insured. Your cargo arrives safe.",
  },
  {
    icon: MapPin,
    title: "Anywhere",
    value: "All SoCal",
    description: "Local, suburbs, or long-distance hauls.",
  },
];

const AdvantagesSection = () => {
  return (
    <section className="relative py-32 md:py-44 overflow-hidden">
      {/* Ambient amber aura */}
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-0 right-0 w-[700px] h-[500px] bg-primary/12 rounded-full blur-[180px]" />
        <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[400px] bg-[hsl(346_85%_45%)]/10 rounded-full blur-[150px]" />
      </div>

      {/* Editorial wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-6 md:-top-10 left-0 right-0 text-center font-heading uppercase tracking-[0.4em] text-foreground/[0.025] text-[18vw] md:text-[14vw] leading-none whitespace-nowrap"
      >
        PICKUP HAUL
      </div>

      <div className="container relative z-10 mx-auto px-6">
        {/* Header — editorial layout */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end mb-16 md:mb-24">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
                Why Pickup Haul
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.92] tracking-tight text-balance">
              Premium service.<br />
              <span className="text-gradient-primary">Predictable price.</span>
            </h2>
          </div>

          {/* Index counter */}
          <div className="lg:col-span-5 flex lg:justify-end">
            <div className="flex items-end gap-4 glass-subtle rounded-2xl px-5 py-4">
              <div className="font-heading text-5xl md:text-6xl text-primary tabular-nums leading-none">
                04
              </div>
              <div className="pb-1">
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                  Pillars
                </div>
                <div className="text-xs text-foreground/80 mt-0.5">of the service</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient image strip — Tacoma detail dissolving into the page */}
        <div className="relative -mx-6 md:mx-0 mb-16 md:mb-20 h-[180px] md:h-[260px]">
          <img
            src={ambientTacoma}
            alt=""
            aria-hidden="true"
            loading="lazy"
            width={1600}
            height={896}
            className="absolute inset-0 w-full h-full object-cover opacity-70"
            style={{
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 25%, #000 75%, transparent 100%)",
              WebkitMaskComposite: "source-in",
              maskImage:
                "linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 25%, #000 75%, transparent 100%)",
              maskComposite: "intersect",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background pointer-events-none" />

          {/* Editorial caption */}
          <div className="absolute bottom-3 md:bottom-5 left-6 md:left-10 flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/70 font-medium">
              Toyota Tacoma TRD · Off-Road · Bronze Oxide
            </span>
          </div>
        </div>

        {/* Pillars — editorial monolith grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border/30 rounded-3xl overflow-hidden glass">
          {advantages.map((adv, idx) => (
            <div
              key={adv.title}
              className="group relative p-8 md:p-10 bg-card/60 hover:bg-card transition-colors duration-700 space-y-7 overflow-hidden"
            >
              {/* Hover glow */}
              <div className="absolute -top-1/2 -right-1/2 w-[300px] h-[300px] bg-primary/0 group-hover:bg-primary/10 rounded-full blur-[100px] transition-all duration-700 pointer-events-none" />

              {/* Header row: icon + index */}
              <div className="relative flex items-start justify-between">
                <div className="size-12 rounded-xl glass-subtle flex items-center justify-center group-hover:border-primary/40 transition-all duration-500">
                  <adv.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-heading text-xs tracking-[0.3em] text-foreground/40 tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </div>
              </div>

              <div className="relative">
                <div className="font-heading text-4xl md:text-5xl font-semibold tracking-tight tabular-nums leading-none">
                  {adv.value}
                </div>
                <div className="mt-3 text-[10px] tracking-[0.3em] uppercase text-primary/80 font-medium">
                  {adv.title}
                </div>
              </div>

              <div className="relative h-px w-12 bg-gradient-to-r from-primary/60 to-transparent" />

              <p className="relative text-sm text-muted-foreground leading-relaxed">
                {adv.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdvantagesSection;
