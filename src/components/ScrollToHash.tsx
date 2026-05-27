import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Smoothly scrolls to the element matching location.hash after route changes.
 * Retries briefly to wait for lazy/async content to mount.
 */
const ScrollToHash = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      // Reset to top on plain route changes (no hash)
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const id = decodeURIComponent(hash.replace("#", ""));
    if (!id) return;

    let attempts = 0;
    const maxAttempts = 20; // ~1s total
    let rafId = 0;
    let timeoutId = 0;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        timeoutId = window.setTimeout(() => {
          rafId = window.requestAnimationFrame(tryScroll);
        }, 50);
      }
    };

    rafId = window.requestAnimationFrame(tryScroll);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname, hash]);

  return null;
};

export default ScrollToHash;
