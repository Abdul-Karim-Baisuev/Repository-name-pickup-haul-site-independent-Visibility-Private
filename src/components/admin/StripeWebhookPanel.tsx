import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle, Webhook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WebhookEvent = {
  id: string;
  received_at: string;
  event_id: string | null;
  event_type: string | null;
  signature_verified: boolean;
  outcome: string;
  http_status: number;
  error_message: string | null;
  estimate_request_id: string | null;
};

type TestResult = {
  ok: boolean;
  mode: "valid" | "invalid";
  event_id: string;
  http_status: number;
  response_body: string;
  duration_ms: number;
  expected: string;
};

const formatDate = (s: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(s));

export const StripeWebhookPanel = () => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<"valid" | "invalid" | null>(null);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("stripe_webhook_events") as never as ReturnType<
      typeof supabase.from
    >)
      .select(
        "id, received_at, event_id, event_type, signature_verified, outcome, http_status, error_message, estimate_request_id",
      )
      .order("received_at", { ascending: false })
      .limit(25);
    setLoading(false);
    if (error) {
      toast.error("Could not load webhook events", { description: error.message });
      return;
    }
    setEvents((data ?? []) as unknown as WebhookEvent[]);
  };

  useEffect(() => {
    load();
  }, []);

  const runTest = async (mode: "valid" | "invalid") => {
    setRunning(mode);
    setLastResult(null);
    const { data, error } = await supabase.functions.invoke("stripe-webhook-test", {
      body: { mode },
    });
    setRunning(null);
    if (error) {
      toast.error("Test failed to dispatch", { description: error.message });
      return;
    }
    const result = data as TestResult;
    setLastResult(result);
    if (result.ok) {
      toast.success(
        mode === "valid" ? "Signature verified · 200 OK" : "Invalid signature correctly rejected (400)",
      );
    } else {
      toast.error("Unexpected webhook response", {
        description: `${result.http_status} — ${result.response_body}`,
      });
    }
    setTimeout(load, 600);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-glow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Webhook className="h-3.5 w-3.5" /> Stripe Webhook Diagnostics
          </div>
          <h3 className="mt-2 font-heading text-2xl uppercase tracking-tight">Signature & event log</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Send a synthetic event signed with your Stripe webhook secret to verify the endpoint accepts
            valid signatures and rejects forged ones. Every received event is logged below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => runTest("valid")}
            disabled={running !== null}
            className="font-heading tracking-wider"
          >
            {running === "valid" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Run signed test
          </Button>
          <Button
            onClick={() => runTest("invalid")}
            disabled={running !== null}
            variant="outline"
            className="font-heading tracking-wider"
          >
            {running === "invalid" ? <Loader2 className="animate-spin" /> : <XCircle />}
            Test forged signature
          </Button>
          <Button onClick={load} variant="ghost" disabled={loading} className="font-heading tracking-wider">
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Refresh
          </Button>
        </div>
      </div>

      {lastResult && (
        <div
          className={`mt-5 rounded-lg border p-4 text-sm ${
            lastResult.ok
              ? "border-primary/30 bg-primary/5"
              : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            {lastResult.ok ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="font-heading uppercase tracking-wider">
              {lastResult.mode === "valid" ? "Signed test" : "Forged-signature test"}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              HTTP {lastResult.http_status}
            </span>
            <span className="text-xs text-muted-foreground">expected: {lastResult.expected}</span>
            <span className="text-xs text-muted-foreground">{lastResult.duration_ms} ms</span>
          </div>
          <div className="mt-2 grid gap-1 font-mono text-xs text-muted-foreground">
            <div>event_id: {lastResult.event_id}</div>
            <div>response: {lastResult.response_body || "—"}</div>
          </div>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Received</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>HTTP</TableHead>
              <TableHead>Event ID</TableHead>
              <TableHead className="min-w-48">Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : events.length ? (
              events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDate(e.received_at)}</TableCell>
                  <TableCell>
                    {e.signature_verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                        <XCircle className="h-3 w-3" /> Rejected
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{e.event_type ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{e.outcome}</TableCell>
                  <TableCell className="text-xs tabular-nums">{e.http_status}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground/80">
                    {e.event_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.error_message ? (
                      <span className="break-all" title={e.error_message}>
                        {e.error_message.slice(0, 200)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No webhook events received yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

export default StripeWebhookPanel;
