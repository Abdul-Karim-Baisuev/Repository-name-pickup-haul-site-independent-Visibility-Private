import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { services } from "@/data/services";

const ServicesSection = () => {
  return (
    <section id="services" className="relative py-28 md:py-36 overflow-hidden scroll-mt-24">
      {/* aurora */}
      <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-1/3 -left-[10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-3xl mb-16 md:mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
              Services
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold leading-[0.95] tracking-tight text-balance">
            Built for every<br />
            <span className="text-gradient-primary">kind of haul.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground font-light max-w-xl leading-relaxed">
            From a single sofa to a full job-site delivery — handled with the same
            precision and care.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.slug}
                to={`/services/${service.slug}`}
                className="group relative glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-500 block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                style={{ animationDelay: `${idx * 80}ms` }}
                aria-label={`Learn more about ${service.title}`}
              >
                {/* photo */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.imageAlt}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/5 pointer-events-none" />

                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] tracking-[0.25em] uppercase text-foreground/80 px-2 py-1 rounded-full glass-subtle">
                      {service.meta}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 size-9 rounded-lg glass-subtle flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>

                {/* hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

                <div className="relative p-6 md:p-7 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl md:text-2xl font-semibold tracking-tight">{service.title}</h3>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:rotate-12 transition-all duration-500 shrink-0 mt-1" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.shortDescription}
                  </p>
                  <div className="text-xs text-primary/90 tracking-wider pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
