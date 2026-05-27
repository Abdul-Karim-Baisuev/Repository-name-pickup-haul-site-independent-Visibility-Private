import { Phone, Mail, MapPin, Facebook } from "lucide-react";
import Logo from "@/components/Logo";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61588208545988";

const Footer = () => {
  return (
    <footer className="relative border-t border-white/5 pt-20 pb-10 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[160px]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid md:grid-cols-12 gap-10 md:gap-8 mb-16">
          <div className="md:col-span-5 space-y-5">
            <Logo />

            <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-sm">
              White-glove pickup &amp; delivery across Southern California. Toyota Tacoma
              TRD Off-Road, fully insured, professional tie-downs.
            </p>
            <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/80 font-medium">
              AutoBais LLC · Van Nuys, CA 91405
            </div>
            <div className="flex items-center gap-3 pt-1">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pickup Haul on Facebook"
                className="group inline-flex h-10 w-10 items-center justify-center rounded-full glass-subtle border border-white/5 hover:border-primary/40 transition-colors"
              >
                <Facebook className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>
          </div>

          <div className="md:col-span-3 space-y-4">
            <div className="text-[10px] tracking-[0.25em] uppercase text-foreground/60 font-medium">
              Explore
            </div>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><a href="/#services" className="hover:text-foreground transition-colors">Services</a></li>
              <li><a href="/#gallery" className="hover:text-foreground transition-colors">Gallery</a></li>
              <li><a href="/#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="/#contact" className="hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <div className="text-[10px] tracking-[0.25em] uppercase text-foreground/60 font-medium">
              Dispatch
            </div>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:+17473706885" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-heading tracking-wider">(747) 370-6885</span>
                </a>
              </li>
              <li>
                <a href="mailto:support@autobais.app" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>support@autobais.app</span>
                </a>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>All of Southern California</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground tracking-wide">
            © 2026 Pickup Haul · AutoBais LLC. All rights reserved.
          </p>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60 font-medium">
            Crafted for the road · SoCal
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
