import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AddressSuggestion = {
  id: string;
  label: string;
  primary: string;
  center: [number, number];
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  inputClassName?: string;
  ariaLabel?: string;
};

const DEBOUNCE_MS = 220;
const CACHE_MAX = 50;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

type CacheEntry = { suggestions: AddressSuggestion[]; ts: number };

// Module-level LRU cache shared across all autocomplete instances.
// Map preserves insertion order, so oldest key is always first.
const suggestionCache = new Map<string, CacheEntry>();

// Per-key hit counter — survives LRU eviction so popular queries stay visible
// in the "top addresses" panel even if briefly pushed out of the cache.
const hitCounts = new Map<string, { count: number; label: string }>();

export type TopHit = { key: string; label: string; count: number };

export const getTopHits = (limit = 5): TopHit[] => {
  return Array.from(hitCounts.entries())
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const clearHitCounts = () => {
  hitCounts.clear();
};

// Module-level counters so all AddressAutocomplete instances share the same stats.
// `distinct` reflects the current size of the LRU cache (unique queries cached right now).
export const autocompleteStats = {
  hits: 0,
  misses: 0,
  aborted: 0,
  requests: 0,
  distinct: 0,
};

const STATS_EVENT = "address-autocomplete-stats";

const emitStats = () => {
  autocompleteStats.distinct = suggestionCache.size;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STATS_EVENT, { detail: { ...autocompleteStats } }));
};

export const AUTOCOMPLETE_STATS_EVENT = STATS_EVENT;

const cacheKey = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

const readCache = (key: string): AddressSuggestion[] | null => {
  const entry = suggestionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    suggestionCache.delete(key);
    return null;
  }
  // Refresh recency
  suggestionCache.delete(key);
  suggestionCache.set(key, entry);
  return entry.suggestions;
};

const writeCache = (key: string, suggestions: AddressSuggestion[]) => {
  if (suggestionCache.has(key)) suggestionCache.delete(key);
  suggestionCache.set(key, { suggestions, ts: Date.now() });
  while (suggestionCache.size > CACHE_MAX) {
    const oldest = suggestionCache.keys().next().value;
    if (oldest === undefined) break;
    suggestionCache.delete(oldest);
  }
};

const AddressAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  invalid,
  inputClassName,
  ariaLabel,
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const listboxId = useId();

  // Debounced fetch with shared LRU cache + cancellation of in-flight requests
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      abortRef.current?.abort();
      abortRef.current = null;
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    // Synchronous cache hit — instant, no network, no flicker
    const key = cacheKey(trimmed);
    const cached = readCache(key);
    if (cached) {
      abortRef.current?.abort();
      abortRef.current = null;
      setSuggestions(cached);
      setOpen(true);
      setActiveIndex(-1);
      setLoading(false);
      autocompleteStats.hits += 1;
      const existing = hitCounts.get(key);
      hitCounts.set(key, { count: (existing?.count ?? 0) + 1, label: key });
      emitStats();
      return;
    }

    const timer = setTimeout(async () => {
      // Cancel any previous in-flight request before starting a new one
      if (abortRef.current) {
        abortRef.current.abort();
        autocompleteStats.aborted += 1;
      }
      const controller = new AbortController();
      abortRef.current = controller;

      autocompleteStats.misses += 1;
      autocompleteStats.requests += 1;
      emitStats();
      setLoading(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-geocode?q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const payload = (await res.json()) as { suggestions?: AddressSuggestion[] };
        const list = payload.suggestions ?? [];
        writeCache(key, list);
        // Drop stale responses (a newer request superseded this one)
        if (controller.signal.aborted) return;
        setSuggestions(list);
        setOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) {
        abortRef.current.abort();
        autocompleteStats.aborted += 1;
        emitStats();
      }
      abortRef.current = null;
    };
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: AddressSuggestion) => {
    skipNextFetch.current = true;
    onChange(s.label);
    onSelect?.(s);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        required={required}
        maxLength={160}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        autoComplete="off"
        className={cn(
          inputClassName,
          invalid && "border-destructive/70 focus-visible:ring-destructive/60",
        )}
      />
      {loading && (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-popover/95 backdrop-blur-xl shadow-2xl"
        >
          {suggestions.map((s, idx) => (
            <li
              key={s.id}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex cursor-pointer items-start gap-3 border-b border-white/5 px-3 py-2.5 text-sm transition-colors last:border-b-0",
                idx === activeIndex ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-secondary/50",
              )}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{s.primary}</div>
                <div className="truncate text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
