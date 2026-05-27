import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SHOW_THRESHOLD = 240;

/**
 * Floating "Back to section start" button.
 *
 * Tracks the current in-view <section id="..."> via IntersectionObserver and
 * scrolls back to the top of that section when clicked. Re-evaluates on hash
 * navigation so the active section stays accurate across anchor links.
 *
 * Sits above BackToTop (bottom-24) so both can coexist without overlap.
 */
const SectionTopButton = () => {
  const { pathname, hash } = useLocation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Observe sections with an id; pick the topmost one currently in view.
  const wireObserver = useCallback(() => {
    observerRef.current?.disconnect();

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("section[id], div[data-section-id]"),
    );
    if (sections.length === 0) {
      setActiveId(null);
      return;
    }

    const visibility = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id =
            (entry.target as HTMLElement).id ||
            (entry.target as HTMLElement).dataset.sectionId ||
            "";
          if (!id) continue;
          visibility.set(id, entry.intersectionRatio);
        }

        // Pick the section with the largest visible area; fall back to topmost.
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        setActiveId(bestRatio > 0.05 ? bestId : null);
      },
      {
        // Bias towards sections whose top is near the viewport top.
        rootMargin: "-15% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach((s) => observer.observe(s));
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    // Wait a tick for the route to render its sections.
    const id = window.setTimeout(wireObserver, 60);
    return () => {
      window.clearTimeout(id);
      observerRef.current?.disconnect();
    };
  }, [pathname, wireObserver]);

  // Re-wire after hash changes (target section may have just mounted).
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(wireObserver, 120);
    return () => window.clearTimeout(id);
  }, [hash, wireObserver]);

  // Track scroll distance so the button only appears once user has moved.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SHOW_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobileMenu = useCallback(() => {
    // 1. Notify any subscribed mobile menu (future-proof hook).
    window.dispatchEvent(new CustomEvent("app:close-mobile-menu"));

    // 2. Close any open Radix overlays acting as a mobile menu.
    const openOverlays = document.querySelectorAll<HTMLElement>(
      '[data-mobile-menu][data-state="open"], [data-state="open"][role="dialog"]',
    );
    let closedAny = false;
    openOverlays.forEach((overlay) => {
      const closeBtn = overlay.querySelector<HTMLElement>(
        '[data-dismiss], [aria-label="Close"]',
      );
      if (closeBtn) {
        closeBtn.click();
        closedAny = true;
      }
    });

    // 3. Restore body scroll if Radix locked it.
    if (closedAny) {
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("pointer-events");
    }

    return closedAny;
  }, []);

  const handleClick = () => {
    if (!activeId) return;
    const el = document.getElementById(activeId);
    if (!el) return;

    // Close mobile menu first so the scroll target isn't covered by the overlay.
    const hadOpenMenu = closeMobileMenu();

    const doScroll = () => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (`#${activeId}` !== window.location.hash) {
        history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#${activeId}`,
        );
      }
    };

    // Defer a frame so overlay exit animation + body unlock complete first.
    if (hadOpenMenu) {
      window.setTimeout(doScroll, 180);
    } else {
      doScroll();
    }
  };

  const visible = scrolled && !!activeId;
  const label = activeId ? activeId.replace(/[-_]/g, " ") : "section";

  return (
    <button
      type="button"
      aria-label={`Back to start of ${label} section`}
      onClick={handleClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "fixed right-6 z-50 h-12 px-4 rounded-full bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-24",
        "bg-card/70 backdrop-blur-md border border-border/40 shadow-lg",
        "flex items-center gap-2 text-foreground",
        "font-display uppercase tracking-wider text-xs",
        "transition-all duration-300 ease-out",
        "hover:bg-primary hover:text-primary-foreground hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
      )}
    >
      <ChevronUp className="h-4 w-4 text-primary" />
      <span className="hidden sm:inline max-w-[10rem] truncate">{label}</span>
      <span className="sm:hidden">Top</span>
    </button>
  );
};

export default SectionTopButton;
