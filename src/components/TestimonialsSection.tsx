import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Mike R.",
    location: "Sherman Oaks, CA",
    rating: 5,
    text: "Showed up on time and hauled away a load of construction debris in one trip. Fair price, no surprises. Will definitely call again.",
  },
  {
    name: "Jessica T.",
    location: "Burbank, CA",
    rating: 5,
    text: "Helped me move a couch and dresser across town the same day I called. Super friendly and careful with my furniture. Highly recommend!",
  },
  {
    name: "David L.",
    location: "Van Nuys, CA",
    rating: 5,
    text: "Picked up a load of lumber from Home Depot and dropped it at my job site. Way cheaper than renting a truck. Solid service.",
  },
  {
    name: "Amanda K.",
    location: "Studio City, CA",
    rating: 5,
    text: "Cleaned out my whole garage in under two hours. Professional, insured, and honest pricing. Couldn't ask for more.",
  },
  {
    name: "Carlos M.",
    location: "North Hollywood, CA",
    rating: 5,
    text: "Reliable, fast, and friendly. Helped me with a last-minute appliance pickup. The Tacoma handled the load no problem.",
  },
  {
    name: "Rachel P.",
    location: "Glendale, CA",
    rating: 5,
    text: "Great communication from start to finish. Sent a quote in minutes and showed up exactly when promised. Five stars all the way.",
  },
];

const initials = (name: string) =>
  name
    .replace(".", "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const TestimonialsSection = () => {
  return (
    <section className="relative py-32 md:py-44 overflow-hidden">
      {/* Aurora */}
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-[hsl(346_85%_45%)]/10 rounded-full blur-[160px]" />
      </div>

      {/* Editorial wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-6 md:-top-10 left-0 right-0 text-center font-heading uppercase tracking-[0.4em] text-foreground/[0.025] text-[18vw] md:text-[14vw] leading-none whitespace-nowrap"
      >
        VOICES
      </div>

      <div className="container relative z-10 mx-auto px-6">
        {/* Header — luxury editorial */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end mb-16 md:mb-24">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
                Reviews
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.92] tracking-tight text-balance">
              Trusted across<br />
              <span className="text-gradient-primary">Southern California.</span>
            </h2>
          </div>

          {/* Engraved score */}
          <div className="lg:col-span-5 flex lg:justify-end">
            <div className="glass-subtle rounded-2xl px-6 py-5 flex items-end gap-5">
              <div className="font-heading text-6xl md:text-7xl text-foreground tabular-nums leading-none tracking-tight">
                5.0
              </div>
              <div className="pb-1.5 space-y-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                  100+ customers
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured signature quote */}
        <div className="relative glass rounded-3xl p-8 md:p-14 mb-6 md:mb-8 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
          <Quote
            aria-hidden="true"
            className="absolute top-6 right-6 md:top-10 md:right-10 h-20 w-20 md:h-32 md:w-32 text-primary/15 rotate-180"
            strokeWidth={1}
          />
          <div className="relative max-w-3xl space-y-8">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="text-2xl md:text-4xl font-light leading-[1.25] text-foreground/95 tracking-tight text-balance">
              "Showed up on time and hauled away a load of construction debris
              in one trip. Fair price, no surprises.
              <span className="text-gradient-primary"> Will definitely call again.</span>"
            </blockquote>
            <div className="flex items-center gap-4 pt-2">
              <div className="size-12 rounded-full glass-subtle flex items-center justify-center font-heading text-sm tracking-wider text-primary">
                MR
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground tracking-wide">
                  Mike R.
                </p>
                <p className="text-xs text-muted-foreground tracking-wider uppercase mt-0.5">
                  Sherman Oaks · CA
                </p>
              </div>
              <div className="ml-auto hidden md:flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-foreground/50">
                <span className="font-heading text-primary">01</span>
                <span>/</span>
                <span>{String(testimonials.length).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {testimonials.slice(1).map((t, idx) => (
            <article
              key={idx}
              className="group relative glass rounded-2xl p-7 md:p-8 flex flex-col gap-5 hover:-translate-y-1 transition-transform duration-500 overflow-hidden"
            >
              <div className="absolute -top-1/2 -right-1/2 w-[260px] h-[260px] bg-primary/0 group-hover:bg-primary/8 rounded-full blur-[100px] transition-all duration-700 pointer-events-none" />

              <div className="relative flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <div className="font-heading text-[10px] tracking-[0.3em] text-foreground/40 tabular-nums">
                  {String(idx + 2).padStart(2, "0")}
                </div>
              </div>

              <p className="relative text-base text-foreground/90 leading-relaxed flex-1 font-light text-pretty">
                "{t.text}"
              </p>

              <div className="relative h-px w-full bg-gradient-to-r from-white/10 via-primary/20 to-transparent" />

              <div className="relative flex items-center gap-3">
                <div className="size-10 rounded-full glass-subtle flex items-center justify-center font-heading text-xs tracking-wider text-primary">
                  {initials(t.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground tracking-wide">{t.name}</p>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-0.5">
                    {t.location}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
