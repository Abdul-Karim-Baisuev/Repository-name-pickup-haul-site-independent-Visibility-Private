import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type CheckStatus = "pass" | "fail" | "warn" | "pending";

type Check = {
  id: string;
  group: "Quote" | "Email" | "Tracking" | "Stripe";
  label: string;
  status: CheckStatus;
  detail?: string;
  timestamp?: string;
};

const fmt = (ts?: string) =>
  ts
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(ts))
    : "—";

const StatusPill = ({ status }: { status: CheckStatus }) => {
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Running
      </span>
    );
  if (status === "pass")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
        <CheckCircle2 className="h-3 w-3" /> Pass
      </span>
    );
  if (status === "warn")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-yellow-500">
        <AlertTriangle className="h-3 w-3" /> Warn
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-destructive">
      <XCircle className="h-3 w-3" /> Fail
    </span>
  );
};

const sb = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
};

async function runChecks(): Promise<Check[]> {
  const now = new Date().toISOString();
  const out: Check[] = [];
  const sinceDays = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

  // ── QUOTE ─────────────────────────────────────────────
  try {
    const { count, error } = await sb
      .from("estimate_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceDays(7));
    out.push({
      id: "quote-volume",
      group: "Quote",
      label: "Estimate requests (last 7d)",
      status: error ? "fail" : (count ?? 0) > 0 ? "pass" : "warn",
      detail: error ? error.message : `${count ?? 0} submitted`,
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "quote-volume", group: "Quote", label: "Estimate requests (last 7d)", status: "fail", detail: String(e), timestamp: now });
  }

  try {
    const { data, error } = await sb
      .from("estimate_requests")
      .select("created_at, public_code")
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = (data?.[0] ?? null) as { created_at?: string; public_code?: string } | null;
    out.push({
      id: "quote-latest",
      group: "Quote",
      label: "Latest estimate row",
      status: error ? "fail" : latest ? "pass" : "warn",
      detail: latest ? `${latest.public_code} · ${fmt(latest.created_at)}` : error?.message ?? "none",
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "quote-latest", group: "Quote", label: "Latest estimate row", status: "fail", detail: String(e), timestamp: now });
  }

  // ── EMAIL ─────────────────────────────────────────────
  try {
    const { data, error } = await sb
      .from("email_send_log")
      .select("status, message_id, created_at")
      .gte("created_at", sinceDays(7))
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ status: string; message_id: string | null; created_at: string }>;
    const latestByMsg = new Map<string, { status: string; created_at: string }>();
    for (const r of rows) {
      const k = r.message_id ?? r.created_at;
      if (!latestByMsg.has(k)) latestByMsg.set(k, { status: r.status, created_at: r.created_at });
    }
    const dedup = Array.from(latestByMsg.values());
    const sent = dedup.filter((r) => r.status === "sent").length;
    const failed = dedup.filter((r) => r.status === "dlq" || r.status === "failed" || r.status === "bounced").length;
    const newest = dedup[0]?.created_at;
    out.push({
      id: "email-sent",
      group: "Email",
      label: "Emails sent (7d, deduped)",
      status: sent > 0 ? "pass" : "warn",
      detail: `${sent} sent · last ${fmt(newest)}`,
      timestamp: now,
    });
    out.push({
      id: "email-failed",
      group: "Email",
      label: "Failed / DLQ emails (7d)",
      status: failed === 0 ? "pass" : "fail",
      detail: `${failed} failures`,
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "email-sent", group: "Email", label: "Emails sent (7d, deduped)", status: "fail", detail: String((e as Error).message ?? e), timestamp: now });
  }

  try {
    const { count, error } = await sb
      .from("estimate_email_send_attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");
    out.push({
      id: "email-attempts-failed",
      group: "Email",
      label: "Estimate email attempts: failed",
      status: error ? "fail" : (count ?? 0) === 0 ? "pass" : "warn",
      detail: error ? error.message : `${count ?? 0} failed attempts`,
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "email-attempts-failed", group: "Email", label: "Estimate email attempts: failed", status: "fail", detail: String(e), timestamp: now });
  }

  try {
    const { count, error } = await sb
      .from("suppressed_emails")
      .select("id", { count: "exact", head: true });
    out.push({
      id: "email-suppression",
      group: "Email",
      label: "Suppression list reachable",
      status: error ? "fail" : "pass",
      detail: error ? error.message : `${count ?? 0} suppressed`,
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "email-suppression", group: "Email", label: "Suppression list reachable", status: "fail", detail: String(e), timestamp: now });
  }

  // ── TRACKING ──────────────────────────────────────────
  try {
    const { count, error } = await sb
      .from("driver_assignments")
      .select("id", { count: "exact", head: true })
      .not("stage", "in", "(completed,canceled)");
    out.push({
      id: "tracking-active",
      group: "Tracking",
      label: "Active driver assignments",
      status: error ? "fail" : "pass",
      detail: error ? error.message : `${count ?? 0} active`,
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "tracking-active", group: "Tracking", label: "Active driver assignments", status: "fail", detail: String(e), timestamp: now });
  }

  try {
    const { count, error } = await sb
      .from("tracking_auth_attempts")
      .select("id", { count: "exact", head: true })
      .gte("attempted_at", sinceDays(1))
      .eq("success", false);
    out.push({
      id: "tracking-auth-fails",
      group: "Tracking",
      label: "Failed tracking auth (24h)",
      status: error ? "fail" : (count ?? 0) < 50 ? "pass" : "warn",
      detail: error ? error.message : `${count ?? 0} failed lookups`,
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "tracking-auth-fails", group: "Tracking", label: "Failed tracking auth (24h)", status: "fail", detail: String(e), timestamp: now });
  }

  try {
    const { data, error } = await sb
      .from("driver_locations")
      .select("recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(1);
    const latest = (data?.[0] as { recorded_at?: string } | undefined)?.recorded_at;
    out.push({
      id: "tracking-pings",
      group: "Tracking",
      label: "Latest driver location ping",
      status: error ? "fail" : latest ? "pass" : "warn",
      detail: latest ? fmt(latest) : error?.message ?? "no pings yet",
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "tracking-pings", group: "Tracking", label: "Latest driver location ping", status: "fail", detail: String(e), timestamp: now });
  }

  // ── STRIPE ────────────────────────────────────────────
  try {
    const { data, error } = await sb
      .from("stripe_webhook_events")
      .select("received_at, event_type, signature_verified, outcome, http_status")
      .gte("received_at", sinceDays(30))
      .order("received_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      received_at: string;
      event_type: string | null;
      signature_verified: boolean;
      outcome: string;
      http_status: number;
    }>;
    const verified = rows.filter((r) => r.signature_verified).length;
    const rejected = rows.filter((r) => !r.signature_verified).length;
    const errored = rows.filter((r) => r.http_status >= 500).length;
    const lastReal = rows.find((r) => r.event_type && !r.event_type.startsWith("lovable."));
    const newest = rows[0]?.received_at;

    out.push({
      id: "stripe-events",
      group: "Stripe",
      label: "Webhook events (30d)",
      status: rows.length > 0 ? "pass" : "warn",
      detail: `${rows.length} events · last ${fmt(newest)}`,
      timestamp: now,
    });
    out.push({
      id: "stripe-verified",
      group: "Stripe",
      label: "Signature verification",
      status: rows.length === 0 ? "warn" : verified > 0 ? "pass" : "fail",
      detail: `${verified} verified · ${rejected} rejected`,
      timestamp: now,
    });
    out.push({
      id: "stripe-errors",
      group: "Stripe",
      label: "Webhook handler errors (5xx)",
      status: errored === 0 ? "pass" : "fail",
      detail: `${errored} server errors`,
      timestamp: now,
    });
    out.push({
      id: "stripe-real",
      group: "Stripe",
      label: "Last real Stripe event",
      status: lastReal ? "pass" : "warn",
      detail: lastReal
        ? `${lastReal.event_type} → ${lastReal.outcome} · ${fmt(lastReal.received_at)}`
        : "only test events in window",
      timestamp: now,
    });
  } catch (e) {
    out.push({ id: "stripe-events", group: "Stripe", label: "Webhook events (30d)", status: "fail", detail: String((e as Error).message ?? e), timestamp: now });
  }

  return out;
}

const AdminVerification = () => {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranAt, setRanAt] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    const results = await runChecks();
    setChecks(results);
    setRanAt(new Date().toISOString());
    setLoading(false);
  };

  useEffect(() => {
    run();
  }, []);

  const summary = useMemo(() => {
    const total = checks.length;
    const pass = checks.filter((c) => c.status === "pass").length;
    const warn = checks.filter((c) => c.status === "warn").length;
    const fail = checks.filter((c) => c.status === "fail").length;
    return { total, pass, warn, fail };
  }, [checks]);

  const groups: Check["group"][] = ["Quote", "Email", "Tracking", "Stripe"];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
            </Link>
            <h1 className="mt-2 font-heading text-3xl uppercase tracking-tight">
              End-to-End Verification
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Read-only health checks across quote submission, email delivery, live tracking, and Stripe webhooks.
            </p>
          </div>
          <Button onClick={run} disabled={loading} className="font-heading tracking-wider">
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Re-run checks
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Total", v: summary.total, c: "text-foreground" },
            { k: "Pass", v: summary.pass, c: "text-primary" },
            { k: "Warn", v: summary.warn, c: "text-yellow-500" },
            { k: "Fail", v: summary.fail, c: "text-destructive" },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-xl border border-border bg-card p-4 shadow-glow-card"
            >
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.k}</div>
              <div className={`mt-1 font-heading text-3xl ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Last run: {ranAt ? fmt(ranAt) : "—"}
        </p>

        <div className="mt-6 space-y-6">
          {groups.map((g) => {
            const items = checks.filter((c) => c.group === g);
            return (
              <section
                key={g}
                className="rounded-xl border border-border bg-card p-6 shadow-glow-card"
              >
                <h2 className="font-heading text-xl uppercase tracking-tight">{g}</h2>
                <div className="mt-4 overflow-hidden rounded-lg border border-border">
                  {loading && items.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No checks in this group.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {items.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{c.label}</div>
                            {c.detail && (
                              <div className="mt-0.5 font-mono text-xs text-muted-foreground break-all">
                                {c.detail}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {fmt(c.timestamp)}
                            </span>
                            <StatusPill status={c.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default AdminVerification;
