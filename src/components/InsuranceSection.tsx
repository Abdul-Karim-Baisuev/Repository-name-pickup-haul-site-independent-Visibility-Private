import { ShieldCheck, FileCheck, BadgeCheck } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    value: "$1M",
    label: "Per Occurrence",
    description: "Commercial general liability up to $1,000,000 per occurrence.",
  },
  {
    icon: FileCheck,
    value: "$2M",
    label: "Aggregate",
    description: "General aggregate limit of $2,000,000 — total peace of mind.",
  },
  {
    icon: BadgeCheck,
    value: "AutoBais",
    label: "LLC",
    description: "Registered business in Van Nuys, CA — serving Southern California.",
  },
];

const InsuranceSection = () => {
  return (
    <section className="relative py-28 md:py-36 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] bg-primary/10 rounded-full blur-[140px]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
                Trust & Safety
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold leading-[0.95] tracking-tight text-balance">
              Licensed.<br />
              <span className="text-gradient-primary">Fully insured.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground font-light max-w-md leading-relaxed">
              Your cargo is protected the moment it leaves the curb. Documentation
              available on request.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {items.map((item) => (
              <article
                key={item.label}
                className="group glass rounded-2xl p-6 md:p-8 flex items-center gap-6 md:gap-8 hover:-translate-y-0.5 transition-transform duration-500"
              >
                <div className="size-14 md:size-16 rounded-2xl glass-subtle flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-colors">
                  <item.icon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-heading text-3xl md:text-4xl font-semibold tracking-tight tabular-nums">
                      {item.value}
                    </span>
                    <span className="text-[10px] tracking-[0.25em] uppercase text-primary/80 font-medium">
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InsuranceSection;
