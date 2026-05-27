import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SHOW_THRESHOLD = 320;

/**
 * Floating "Back to top" button.
 * - Visible after scrolling past SHOW_THRESHOLD.
 * - Re-evaluates visibility on route/hash changes (anchor navigation may
 *   shift scroll position asynchronously, so we poll briefly).
 */
const BackToTop = () => {
  const { pathname, hash } = useLocation();
  const [visible, setVisible] = useState(false);

  const evaluate = useCallback(() => {
    setVisible(window.scrollY > SHOW_THRESHOLD);
  }, []);

  useEffect(() => {
    evaluate();
    window.addEventListener("scroll", evaluate, { passive: true });
    window.addEventListener("resize", evaluate);
    return () => {
      window.removeEventListener("scroll", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, [evaluate]);

  // Re-check after navigations (hash scroll happens asynchronously).
  useEffect(() => {
    let attempts = 0;
    const id = window.setInterval(() => {
      evaluate();
      attempts += 1;
      if (attempts > 10) window.clearInterval(id);
    }, 120);
    return () => window.clearInterval(id);
  }, [pathname, hash, evaluate]);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Clear hash so subsequent clicks on the same anchor still trigger scroll.
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setVisible(false);
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={handleClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "fixed right-6 z-50 h-12 w-12 rounded-full",
        "bottom-[calc(0.5rem+env(safe-area-inset-bottom))] md:bottom-6",
        "bg-card/70 backdrop-blur-md border border-border/40 shadow-lg",
        "flex items-center justify-center text-primary",
        "transition-all duration-300 ease-out",
        "hover:bg-primary hover:text-primary-foreground hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
};

export default BackToTop;
