import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import { useQuoteDialog } from "@/components/quote/QuoteDialogContext";
import Logo from "@/components/Logo";

const Navbar = () => {
  const { open: openQuote } = useQuoteDialog();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-subtle border-b border-border/40"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
        <Logo />


        <div className="hidden md:flex items-center gap-10 text-sm font-medium tracking-wide text-muted-foreground">
          <a href="/#services" className="hover:text-foreground transition-colors">
            Services
          </a>
          <a href="/#packages" className="hover:text-foreground transition-colors">
            Packages
          </a>
          <a href="/#gallery" className="hover:text-foreground transition-colors">
            Gallery
          </a>
          <a href="/#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="/#contact" className="hover:text-foreground transition-colors">
            Contact
          </a>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              Prefer to talk?
            </div>
            <a
              href="tel:+17473706885"
              className="font-heading tracking-wider text-foreground/70 text-xs hover:text-primary transition-colors"
            >
              (747) 370-6885
            </a>
          </div>
          <a
            href="tel:+17473706885"
            className="sm:hidden glass-subtle rounded-full p-2.5 text-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Call dispatch"
          >
            <Phone className="h-4 w-4" />
          </a>
          <CTAButton
            as="button"
            onClick={openQuote}
            variant="primary"
            size="sm"
            icon="arrow"
          >
            Get Quote
          </CTAButton>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
