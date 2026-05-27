import heroImg from "@/assets/hero-loading-cart.jpg";
import tacomaShadow from "@/assets/truck-front.jpg";
import fleetImg from "@/assets/fleet-three-vehicles.jpg";
import { MapPin, Shield } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import { useQuoteDialog } from "@/components/quote/QuoteDialogContext";

const HeroSection = () => {
  const { open: openQuote } = useQuoteDialog();
  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col">
      {/* Aurora glow background — multi-layer cinematic */}
      <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen">
        {/* Amber core — top right */}
        <div className="absolute -top-[15%] -right-[10%] w-[820px] h-[640px] bg-primary/40 rounded-full blur-[170px] rotate-[-15deg] animate-aurora-shift" />
        {/* Crimson sweep — mid left */}
        <div className="absolute top-[35%] -left-[20%] w-[680px] h-[560px] bg-[hsl(346_85%_45%)]/30 rounded-full blur-[150px] animate-aurora-shift [animation-delay:-8s]" />
        {/* Violet accent — bottom right */}
        <div className="absolute bottom-[-25%] right-[10%] w-[560px] h-[460px] bg-[hsl(280_70%_50%)]/20 rounded-full blur-[140px] animate-aurora-shift [animation-delay:-15s]" />
        {/* Warm pulse — center */}
        <div className="absolute top-[20%] left-[35%] w-[420px] h-[420px] bg-[hsl(22_100%_62%)]/15 rounded-full blur-[120px] animate-aurora-pulse" />
        {/* Cool ember — bottom left */}
        <div className="absolute bottom-[10%] left-[5%] w-[380px] h-[380px] bg-[hsl(195_80%_50%)]/12 rounded-full blur-[130px] animate-aurora-pulse [animation-delay:-4s]" />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_30%,transparent_100%)]" />

      {/* Fleet ribbon — three vehicles emerging from darkness at the very top of the hero */}
      <div className="relative z-10 pt-24 md:pt-28 -mb-8 md:-mb-16 lg:-mb-24">
        <div className="relative w-full h-[180px] sm:h-[240px] md:h-[320px] lg:h-[380px]">
          <img
            src={fleetImg}
            alt="PICKUP HAUL fleet — Toyota Camry XSE, Toyota Tacoma TRD with bed lumber rack, and Ford Bronco Sport emerging from darkness"
            width={1536}
            height={1024}
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 80% 78% at 50% 50%, #000 35%, transparent 92%)",
              maskImage:
                "radial-gradient(ellipse 80% 78% at 50% 50%, #000 35%, transparent 92%)",
            }}
          />
          {/* Edge fades to seamlessly merge with the page void */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />

          {/* Editorial caption */}
          <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-1.5 rounded-full glass-subtle">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/80 font-medium whitespace-nowrap">
              Camry XSE · Tacoma TRD · Bronco Sport
            </span>
          </div>
        </div>
      </div>

      <main className="relative z-10 flex-1 flex items-center pt-4 md:pt-6 pb-16">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-7 flex flex-col gap-7 md:gap-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass-subtle w-max">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-primary" />
              </span>
              <span className="text-xs font-medium tracking-[0.2em] text-foreground/80 uppercase">
                Available Now • SoCal
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-balance">
              Premium Pickup &amp; Delivery.
              <br />
              <span className="text-gradient-primary">Careful Hauling &amp; Setup.</span>
            </h1>

            <p className="text-base md:text-xl text-muted-foreground font-light max-w-[55ch] leading-relaxed text-pretty">
              Local pickup, delivery &amp; careful hauling across Southern California — Marketplace
              pickups, furniture, appliances, long items, and small moves. Three-vehicle fleet,
              fully insured, professional tie-downs, plus basic assembly &amp; install of what we
              bring (bed frames, tables, desks, and more).
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <CTAButton as="button" onClick={openQuote} variant="primary" size="lg" icon="arrow">
                Start Free Quote
              </CTAButton>
              <CTAButton
                href={`https://wa.me/17473706885?text=${encodeURIComponent("Hi! I'd like to ask about a pickup truck hauling job.")}`}
                variant="secondary"
                size="lg"
                icon="message"
                iconPosition="left"
                target="_blank"
                rel="noopener noreferrer"
              >
                Text on WhatsApp
              </CTAButton>
            </div>

            <a
              href="#quote"
              className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-primary/90 hover:text-primary transition-colors w-max"
            >
              <span className="size-1 rounded-full bg-primary animate-pulse" />
              Start request below — address &amp; map autocomplete · up to 6 stops
            </a>

            <p className="text-xs text-muted-foreground/80 pt-1">
              Fastest reply by text or quote form ·{" "}
              <a href="mailto:support@autobais.app" className="underline underline-offset-4 hover:text-primary transition-colors">
                email us
              </a>{" "}
              ·{" "}
              <a href="tel:+17473706885" className="underline underline-offset-4 hover:text-primary transition-colors">
                or call (747) 370-6885
              </a>
            </p>

            <div className="flex flex-wrap items-center gap-5 md:gap-8 pt-4 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>$1M / $2M Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Van Nuys • LA • OC • IE</span>
              </div>
            </div>
          </div>

          {/* Right: cinematic frameless image + glass cards */}
          <div className="lg:col-span-5 relative animate-scale-in [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
            {/* Tacoma feathered shadow — behind, blends into void */}
            <img
              src={tacomaShadow}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -inset-12 sm:-inset-20 w-[calc(100%+6rem)] sm:w-[calc(100%+10rem)] h-[calc(100%+6rem)] sm:h-[calc(100%+10rem)] object-cover opacity-20 blur-3xl saturate-150 [mask-image:radial-gradient(ellipse_55%_50%_at_50%_50%,black_20%,transparent_75%)] [-webkit-mask-image:radial-gradient(ellipse_55%_50%_at_50%_50%,black_20%,transparent_75%)] z-0"
            />

            {/* Frameless hero image — emerges from darkness, no border, no rounded box */}
            <div className="relative z-10 w-full max-w-[520px] mx-auto lg:ml-auto aspect-[3/4]">
              <img
                src={heroImg}
                alt="Professional mover loading a hand cart of cargo onto a Toyota Tacoma TRD Off-Road tailgate at night"
                className="w-full h-full object-cover object-center select-none pointer-events-none"
                width={1024}
                height={1536}
                loading="eager"
                style={{
                  WebkitMaskImage:
                    "radial-gradient(ellipse 75% 80% at 55% 50%, #000 40%, transparent 92%)",
                  maskImage:
                    "radial-gradient(ellipse 75% 80% at 55% 50%, #000 40%, transparent 92%)",
                }}
              />
            </div>

            {/* Floating glass card — live status */}
            <div className="absolute top-8 -left-2 sm:-left-6 lg:-left-16 z-20 glass rounded-2xl p-4 sm:p-5 w-[230px] sm:w-[260px] animate-fade-in [animation-delay:500ms] opacity-0 [animation-fill-mode:forwards]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
                  Dispatch
                </div>
                <div className="font-heading text-primary text-xs tracking-wider">UNIT-01</div>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5">
                    Origin
                  </div>
                  <div className="text-sm text-foreground font-medium">Van Nuys, CA 91405</div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5">
                    Coverage
                  </div>
                  <div className="text-sm text-foreground font-medium">All of Southern California</div>
                </div>
              </div>
            </div>

            {/* Floating glass card — payload metric */}
            <div className="absolute bottom-12 -right-2 sm:-right-4 lg:-right-8 z-20 glass rounded-2xl p-4 sm:p-5 animate-fade-in [animation-delay:700ms] opacity-0 [animation-fill-mode:forwards]">
              <div className="flex items-end gap-3 sm:gap-4">
                <div>
                  <div className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-1.5">
                    Bed / Trailer
                  </div>
                  <div className="font-heading text-3xl sm:text-4xl text-foreground tracking-tight tabular-nums leading-none">
                    1,600
                    <span className="text-base text-muted-foreground ml-1">/ 3,500 lbs</span>
                  </div>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-primary/30 flex items-center justify-center bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.3)]">
                  <span className="text-primary text-[10px] sm:text-xs font-bold font-heading tracking-wider">
                    OK
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none z-[1]" />
    </section>
  );
};

export default HeroSection;
