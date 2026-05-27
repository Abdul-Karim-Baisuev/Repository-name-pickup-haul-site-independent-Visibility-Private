import { useEffect, useRef, useState } from "react";
import { Activity, Download, X } from "lucide-react";

import {
  AUTOCOMPLETE_STATS_EVENT,
  autocompleteStats,
  clearHitCounts,
  getTopHits,
  type TopHit,
} from "@/components/quote/AddressAutocomplete";

type Stats = { hits: number; misses: number; aborted: number; requests: number; distinct: number };

/**
 * Floating dev overlay that shows live AddressAutocomplete cache stats.
 * Mounted only in dev (import.meta.env.DEV) so it never ships to production.
 */
type Snapshot = Stats & { ts: string; hitRate: number };

const TOP_N = 5;

const AutocompleteStatsOverlay = () => {
  const [stats, setStats] = useState<Stats>({ ...autocompleteStats });
  const [topHits, setTopHits] = useState<TopHit[]>(() => getTopHits(TOP_N));
  const [visible, setVisible] = useState(true);
  const historyRef = useRef<Snapshot[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Stats>).detail;
      if (!detail) return;
      setStats(detail);
      setTopHits(getTopHits(TOP_N));
      const total = detail.hits + detail.misses;
      const hitRate = total > 0 ? Math.round((detail.hits / total) * 100) : 0;
      historyRef.current.push({
        ts: new Date().toISOString(),
        hits: detail.hits,
        misses: detail.misses,
        aborted: detail.aborted,
        requests: detail.requests,
        distinct: detail.distinct,
        hitRate,
      });
      // Cap memory: keep last 1000 snapshots
      if (historyRef.current.length > 1000) {
        historyRef.current.splice(0, historyRef.current.length - 1000);
      }
    };
    window.addEventListener(AUTOCOMPLETE_STATS_EVENT, handler);
    return () => window.removeEventListener(AUTOCOMPLETE_STATS_EVENT, handler);
  }, []);

  if (!visible) return null;

  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? Math.round((stats.hits / total) * 100) : 0;
  const maxHitCount = topHits[0]?.count ?? 0;

  const reset = () => {
    autocompleteStats.hits = 0;
    autocompleteStats.misses = 0;
    autocompleteStats.aborted = 0;
    autocompleteStats.requests = 0;
    clearHitCounts();
    historyRef.current = [];
    setTopHits([]);
    setStats({ ...autocompleteStats });
  };

  const downloadCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;

  const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

  const exportCsv = () => {
    const rows = historyRef.current;
    if (rows.length === 0) return;
    const header = "timestamp,hits,misses,aborted,requests,distinct,hit_rate_pct";
    const body = rows
      .map((r) => `${r.ts},${r.hits},${r.misses},${r.aborted},${r.requests},${r.distinct},${r.hitRate}`)
      .join("\n");
    downloadCsv(`autocomplete-stats-${stamp()}.csv`, `${header}\n${body}\n`);
  };

  const exportTopHits = () => {
    if (topHits.length === 0) return;
    const header = "rank,key,label,hits";
    const body = topHits
      .map((h, i) => `${i + 1},${csvEscape(h.key)},${csvEscape(h.label)},${h.count}`)
      .join("\n");
    downloadCsv(`autocomplete-top-hits-${stamp()}.csv`, `${header}\n${body}\n`);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-72 rounded-xl border border-white/10 bg-popover/95 backdrop-blur-xl shadow-2xl p-3 text-xs font-mono">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-primary">
          <Activity className="h-3.5 w-3.5" />
          <span className="tracking-wider uppercase text-[10px] font-heading">
            Autocomplete
          </span>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Hide stats"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        <Row label="Cache hits" value={stats.hits} accent="primary" />
        <Row label="Cache misses" value={stats.misses} />
        <Row label="Network reqs" value={stats.requests} />
        <Row label="Aborted" value={stats.aborted} accent="destructive" />
        <Row label="Distinct in cache" value={stats.distinct} accent="primary" />
        <Row label="Hit rate" value={`${hitRate}%`} accent="primary" />
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Top {TOP_N} queries
          </span>
          <button
            type="button"
            onClick={exportTopHits}
            disabled={topHits.length === 0}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Export top hits as CSV"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
        {topHits.length === 0 ? (
          <div className="text-[10px] text-muted-foreground/60 italic py-1">
            No cache hits yet — type the same address twice.
          </div>
        ) : (
          <ul className="space-y-1">
            {topHits.map((h) => {
              const pct = maxHitCount > 0 ? (h.count / maxHitCount) * 100 : 0;
              return (
                <li key={h.key} className="relative">
                  <div className="absolute inset-0 rounded-sm bg-primary/10" style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between gap-2 px-1.5 py-1">
                    <span className="truncate text-foreground/90" title={h.label}>
                      {h.label}
                    </span>
                    <span className="shrink-0 text-primary font-medium tabular-nums">
                      ×{h.count}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={exportCsv}
          disabled={historyRef.current.length === 0}
          className="inline-flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 border border-primary/30 hover:border-primary/50 bg-primary/5 rounded-md py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-white/5 rounded-md py-1.5 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "primary" | "destructive";
}) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span
      className={
        accent === "primary"
          ? "text-primary font-medium"
          : accent === "destructive"
            ? "text-destructive font-medium"
            : "text-foreground font-medium"
      }
    >
      {value}
    </span>
  </div>
);

export default AutocompleteStatsOverlay;
