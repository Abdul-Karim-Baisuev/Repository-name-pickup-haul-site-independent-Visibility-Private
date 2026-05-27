import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Phone } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Breadcrumbs from "@/components/Breadcrumbs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingSocials from "@/components/FloatingSocials";
import CTAButton from "@/components/CTAButton";
import SEO from "@/components/SEO";
import { useQuoteDialog } from "@/components/quote/QuoteDialogContext";
import { getServiceBySlug, services } from "@/data/services";
import NotFound from "@/pages/NotFound";

const SITE_URL = "https://www.autobais.app";

const ServicePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { open: openQuote } = useQuoteDialog();
  const service = slug ? getServiceBySlug(slug) : undefined;

  if (!service) return <NotFound />;

  const Icon = service.icon;
  const canonical = `${SITE_URL}/services/${service.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.title,
      serviceType: service.title,
      description: service.seoDescription,
      image: `${SITE_URL}${service.social.image}`,
      provider: {
        "@type": "MovingCompany",
        name: "PICKUP HAUL",
        telephone: "+1-747-370-6885",
        email: "support@autobais.app",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Van Nuys",
          addressRegion: "CA",
          postalCode: "91405",
          addressCountry: "US",
        },
      },
      areaServed: [
        { "@type": "AdministrativeArea", name: "Los Angeles County" },
        { "@type": "AdministrativeArea", name: "Orange County" },
        { "@type": "AdministrativeArea", name: "Inland Empire" },
        { "@type": "AdministrativeArea", name: "Southern California" },
      ],
      url: canonical,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/#services` },
        { "@type": "ListItem", position: 3, name: service.title, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  const otherServices = services.filter((s) => s.slug !== service.slug);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={service.seoTitle}
        description={service.seoDescription}
        canonical={canonical}
        keywords={service.keywords}
        ogTitle={service.social.ogTitle}
        ogDescription={service.social.ogDescription}
        image={service.social.image}
        imageWebp={service.social.imageWebp}
        imageAlt={service.social.imageAlt}
        jsonLd={jsonLd}
      />
      <Navbar />

      <main>
        <section className="relative pt-32 md:pt-40 pb-20 md:pb-28 overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen">
            <div className="absolute -top-[10%] -right-[10%] w-[640px] h-[520px] bg-primary/30 rounded-full blur-[160px]" />
            <div className="absolute top-[40%] -left-[15%] w-[500px] h-[420px] bg-[hsl(346_85%_45%)]/20 rounded-full blur-[140px]" />
          </div>

          <div className="container relative z-10 mx-auto px-6">
            <Breadcrumbs
              className="mb-8"
              items={[
                { label: "Home", href: "/" },
                { label: "Services", href: "/#services" },
                { label: service.title },
              ]}
            />

            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-8 space-y-7">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass-subtle w-max">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/80 uppercase">
                    {service.hero.eyebrow} · SoCal
                  </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight text-balance">
                  {service.hero.headline}
                  <br />
                  <span className="text-gradient-primary">{service.hero.headlineAccent}</span>
                </h1>

                <p className="text-base md:text-lg text-muted-foreground font-light max-w-[58ch] leading-relaxed text-pretty">
                  {service.hero.intro}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <CTAButton as="button" onClick={openQuote} variant="primary" size="lg" icon="arrow">
                    Request Quote
                  </CTAButton>
                  <CTAButton
                    href="tel:+17473706885"
                    variant="secondary"
                    size="lg"
                    icon="phone"
                    iconPosition="left"
                  >
                    Call Dispatch
                  </CTAButton>
                </div>
              </div>

              <aside className="lg:col-span-4 glass rounded-2xl p-6 md:p-7 space-y-4">
                <div className="text-[10px] tracking-[0.25em] uppercase text-foreground/60 font-medium">
                  Quick Facts
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">Insured $1M / $2M general liability</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">Tacoma TRD — 1,600 lbs in bed · 3,500 lbs with trailer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{service.vehicle}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">Service across LA, OC & Inland Empire</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">Same-day & scheduled bookings</span>
                  </li>
                </ul>
                <a
                  href="tel:+17473706885"
                  className="flex items-center gap-2 text-primary font-heading tracking-wider text-sm pt-2"
                >
                  <Phone className="h-4 w-4" /> (747) 370-6885
                </a>
              </aside>
            </div>
          </div>
        </section>

        <section className="relative py-20 md:py-24 overflow-hidden">
          <div className="container relative z-10 mx-auto px-6">
            <div className="max-w-2xl mb-12 space-y-4">
              <div className="text-[10px] tracking-[0.25em] uppercase text-primary/80 font-medium">
                Why us
              </div>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
                Done right, every time.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {service.highlights.map((h) => (
                <div key={h.title} className="glass rounded-2xl p-6 md:p-7 space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight">{h.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{h.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-20 md:py-24 overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[140px]" />
          </div>
          <div className="container relative z-10 mx-auto px-6">
            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="text-[10px] tracking-[0.25em] uppercase text-primary/80 font-medium">
                  What's included
                </div>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
                  Everything you need —{" "}
                  <span className="text-gradient-primary">in one trip.</span>
                </h2>
                <p className="text-muted-foreground font-light leading-relaxed max-w-md">
                  Each {service.title.toLowerCase()} job is handled end-to-end by our crew, with
                  the right gear on board.
                </p>
              </div>
              <ul className="lg:col-span-7 grid sm:grid-cols-2 gap-3">
                {service.includes.map((item) => (
                  <li
                    key={item}
                    className="glass-subtle rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-foreground/90"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="faq" className="relative py-20 md:py-24 scroll-mt-24">
          <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen">
            <div className="absolute top-1/4 right-0 w-[420px] h-[420px] bg-primary/10 rounded-full blur-[140px]" />
          </div>
          <div className="container relative z-10 mx-auto px-6">
            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-28">
                <div className="text-[10px] tracking-[0.25em] uppercase text-primary/80 font-medium">
                  {service.title} · FAQ
                </div>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
                  {service.title}{" "}
                  <span className="text-gradient-primary">questions, answered.</span>
                </h2>
                <p className="text-muted-foreground font-light leading-relaxed max-w-md">
                  Everything SoCal homeowners and contractors ask before booking{" "}
                  {service.title.toLowerCase()} with PICKUP HAUL.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <CTAButton as="button" onClick={openQuote} variant="primary" size="md" icon="arrow">
                    {service.cta.primaryLabel}
                  </CTAButton>
                  <a
                    href="tel:+17473706885"
                    className="inline-flex items-center gap-2 text-primary font-heading tracking-wider text-sm"
                  >
                    <Phone className="h-4 w-4" /> (747) 370-6885
                  </a>
                </div>
              </div>

              <div className="lg:col-span-7">
                <Accordion
                  type="single"
                  collapsible
                  defaultValue="faq-0"
                  className="glass rounded-2xl px-2 md:px-4"
                >
                  {service.faqs.map((f, i) => (
                    <AccordionItem
                      key={f.q}
                      value={`faq-${i}`}
                      className="border-b border-white/5 last:border-0"
                    >
                      <AccordionTrigger className="text-left text-base md:text-lg font-semibold tracking-tight px-4 py-5 hover:no-underline">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-5 text-sm text-muted-foreground leading-relaxed">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-20 md:py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
                Other services
              </h2>
              <Link
                to="/#services"
                className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {otherServices.map((s) => {
                const SIcon = s.icon;
                return (
                  <Link
                    key={s.slug}
                    to={`/services/${s.slug}`}
                    className="group glass rounded-2xl p-6 hover:-translate-y-1 transition-all duration-500 space-y-4 block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="size-11 rounded-xl glass-subtle flex items-center justify-center group-hover:bg-primary/20 transition-all">
                        <SIcon className="h-5 w-5 text-primary" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-primary/80 font-medium">
                        {s.meta}
                      </div>
                      <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen">
            <div className="absolute -top-[10%] left-1/3 w-[520px] h-[420px] bg-primary/25 rounded-full blur-[160px]" />
            <div className="absolute bottom-0 right-0 w-[420px] h-[360px] bg-[hsl(346_85%_45%)]/20 rounded-full blur-[140px]" />
          </div>
          <div className="container relative z-10 mx-auto px-6">
            <div className="glass rounded-3xl p-10 md:p-16 text-center space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
                  {service.cta.eyebrow}
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-balance">
                {service.cta.title}{" "}
                <span className="text-gradient-primary">{service.cta.titleAccent}</span>
              </h2>
              <p className="text-muted-foreground font-light max-w-xl mx-auto leading-relaxed">
                {service.cta.description}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <CTAButton as="button" onClick={openQuote} variant="primary" size="lg" icon="arrow">
                  {service.cta.primaryLabel}
                </CTAButton>
                <CTAButton
                  href="tel:+17473706885"
                  variant="secondary"
                  size="lg"
                  icon="phone"
                  iconPosition="left"
                >
                  {service.cta.secondaryLabel}
                </CTAButton>
              </div>
              <p className="text-xs tracking-[0.2em] uppercase text-foreground/50 pt-2">
                Insured · Same-day · Across SoCal
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingSocials />
    </div>
  );
};

export default ServicePage;
