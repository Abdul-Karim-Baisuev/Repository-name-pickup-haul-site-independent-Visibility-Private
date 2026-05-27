import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Facebook, MessageCircle, ArrowRight } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import ambientProfile from "@/assets/ambient-tacoma-profile.jpg";

const channels = [
  {
    icon: MessageCircle,
    label: "Text on WhatsApp",
    sub: "Fastest reply · usually within 5 min",
    href: `https://wa.me/17473706885?text=${encodeURIComponent("Hi! I'd like to ask about a pickup truck hauling job.")}`,
    external: true,
  },
  {
    icon: Mail,
    label: "support@autobais.app",
    sub: "Best for photos & details · reply within 15 min",
    href: "mailto:support@autobais.app",
    external: false,
  },
  {
    icon: Phone,
    label: "(747) 370-6885",
    sub: "Prefer to talk? Call anytime · 7 days",
    href: "tel:+17473706885",
    external: false,
  },
  { icon: MapPin, label: "Southern California", sub: "Greater LA, OC & IE", href: "#", external: false },
  {
    icon: Facebook,
    label: "Facebook",
    sub: "Follow our hauls & updates",
    href: "https://www.facebook.com/profile.php?id=61588208545988",
    external: true,
  },
];

const ContactSection = () => {
  return (
    <section id="contact" className="relative py-32 md:py-44 overflow-hidden scroll-mt-24">
      {/* Aurora */}
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-0 -right-1/4 w-[800px] h-[700px] bg-primary/15 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 -left-1/4 w-[600px] h-[500px] bg-[hsl(346_80%_40%)]/12 rounded-full blur-[160px]" />
      </div>

      {/* Editorial wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-6 md:-top-10 left-0 right-0 text-center font-heading uppercase tracking-[0.4em] text-foreground/[0.025] text-[18vw] md:text-[14vw] leading-none whitespace-nowrap"
      >
        DISPATCH
      </div>

      {/* Ambient Tacoma profile — dissolves into the background */}
      <img
        src={ambientProfile}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={1600}
        height={896}
        className="pointer-events-none select-none absolute right-0 bottom-0 w-[80%] md:w-[55%] max-w-[900px] opacity-30 md:opacity-40 z-0"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 70% 60%, #000 30%, transparent 85%)",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 70% 60%, #000 30%, transparent 85%)",
        }}
      />

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Info */}
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
                  Contact Dispatch
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.92] tracking-tight text-balance">
                Let's haul<br />
                <span className="text-gradient-primary">something today.</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground font-light max-w-md leading-relaxed text-pretty">
                Tell us what you need moved — we confirm a price and a pickup window
                within 15 minutes.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-primary hover:text-primary/80 transition-colors"
              >
                Open full page →
              </a>
            </div>

            {/* Hours strip */}
            <div className="flex items-center gap-4 glass-subtle rounded-2xl px-5 py-4 max-w-md">
              <div className="font-heading text-3xl text-primary tabular-nums leading-none">
                7
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                  Days a week
                </div>
                <div className="text-sm text-foreground/90 mt-0.5">
                  6:00 AM – 11:00 PM · PST
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {channels.map((c, idx) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noopener noreferrer" : undefined}
                  className="group relative flex items-center gap-5 glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute -top-1/2 -right-1/4 w-[300px] h-[300px] bg-primary/0 group-hover:bg-primary/10 rounded-full blur-[100px] transition-all duration-700 pointer-events-none" />

                  <div className="relative size-12 rounded-xl glass-subtle flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-colors">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <div className="font-heading text-base tracking-wider text-foreground">
                      {c.label}
                    </div>
                    <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-1">
                      {c.sub}
                    </div>
                  </div>
                  <div className="relative font-heading text-[10px] tracking-[0.3em] text-foreground/30 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <ArrowRight className="relative h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </a>
              ))}
            </div>
          </div>

          {/* Form — concierge panel */}
          <div className="lg:col-span-7">
            <div className="relative glass rounded-3xl p-6 md:p-10 space-y-5 overflow-hidden">
              <div className="absolute -top-1/3 -right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

              <div className="relative flex items-center justify-between mb-2 pb-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl glass-subtle flex items-center justify-center">
                    <span className="font-heading text-primary text-xs tracking-wider">QF</span>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                      Quick Quote · Form 01
                    </div>
                    <div className="text-xs text-foreground/80 mt-0.5">
                      Average response · under 15 min
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  <div className="font-heading text-xs tracking-[0.25em] text-primary">LIVE</div>
                </div>
              </div>

              <div className="relative grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                    Name
                  </label>
                  <Input placeholder="Your name" className="bg-secondary/40 border-white/5 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                    Phone
                  </label>
                  <Input placeholder="(555) 123-4567" className="bg-secondary/40 border-white/5 h-12 rounded-xl" />
                </div>
              </div>

              <div className="relative space-y-2">
                <label className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                  Route
                </label>
                <Input placeholder="Pickup → Drop-off" className="bg-secondary/40 border-white/5 h-12 rounded-xl" />
              </div>

              <div className="relative space-y-2">
                <label className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                  Cargo details
                </label>
                <Textarea
                  placeholder="What needs hauling? Approximate weight, dimensions, special handling..."
                  rows={5}
                  className="bg-secondary/40 border-white/5 resize-none rounded-xl"
                />
              </div>

              <div className="relative pt-2">
                <CTAButton
                  as="button"
                  type="submit"
                  variant="primary"
                  size="md"
                  icon="arrow"
                  className="w-full"
                >
                  Send Request
                </CTAButton>
              </div>

              <p className="relative text-[11px] text-muted-foreground text-center font-light tracking-wide">
                We reply by text or email within 15 min · No payment online · We confirm
                the exact price before dispatch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
