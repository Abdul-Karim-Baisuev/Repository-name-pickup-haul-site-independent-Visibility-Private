import { useEffect, useState } from "react";
import { Loader2, Save, Copy, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type LinkType = "deposit" | "full" | "balance";

interface Props {
  estimateId: string;
  publicCode: string;
}

interface PaymentRow {
  final_price_cents: number | null;
  deposit_amount_cents: number | null;
  balance_due_cents: number | null;
  payment_status: string;
  payment_token: string;
  last_payment_link_type: LinkType | null;
  last_payment_link_sent_at: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
}

const PUBLIC_SITE =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ?? "https://www.autobais.app";

const STATUS_BADGE: Record<string, string> = {
  unpaid: "bg-muted text-muted-foreground border-border",
  deposit_pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  full_pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  balance_pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  deposit_paid: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  refunded: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  failed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const dollarsToCents = (s: string): number | null => {
  const v = Number(s);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
};
const centsToDollars = (c: number | null): string => (c == null ? "" : (c / 100).toFixed(2));

export const EstimatePaymentPanel = ({ estimateId, publicCode }: Props) => {
  const [row, setRow] = useState<PaymentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [finalPrice, setFinalPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [balance, setBalance] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("estimate_requests")
      .select(
        "final_price_cents, deposit_amount_cents, balance_due_cents, payment_status, payment_token, last_payment_link_type, last_payment_link_sent_at, stripe_payment_intent_id, paid_at",
      )
      .eq("id", estimateId)
      .maybeSingle();
    if (error) {
      toast.error("Failed to load payment info");
      setLoading(false);
      return;
    }
    setRow(data as PaymentRow);
    setFinalPrice(centsToDollars(data?.final_price_cents ?? null));
    setDeposit(centsToDollars(data?.deposit_amount_cents ?? null));
    setBalance(centsToDollars(data?.balance_due_cents ?? null));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimateId]);

  const autoBalance = () => {
    const f = dollarsToCents(finalPrice);
    const d = dollarsToCents(deposit);
    if (f != null && d != null && d <= f) setBalance(((f - d) / 100).toFixed(2));
  };

  const save = async () => {
    const fc = finalPrice ? dollarsToCents(finalPrice) : null;
    const dc = deposit ? dollarsToCents(deposit) : null;
    const bc = balance ? dollarsToCents(balance) : null;

    if (fc != null && fc < 100) {
      toast.error("Final price must be at least $1");
      return;
    }
    if (dc != null && fc != null && dc > fc) {
      toast.error("Deposit cannot exceed final price");
      return;
    }
    if (bc != null && fc != null && bc > fc) {
      toast.error("Balance cannot exceed final price");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("estimate_requests")
      .update({
        final_price_cents: fc,
        deposit_amount_cents: dc,
        balance_due_cents: bc,
      } as never)
      .eq("id", estimateId);
    setSaving(false);
    if (error) {
      toast.error("Save failed", { description: error.message });
      return;
    }
    toast.success("Payment amounts saved");
    load();
  };

  const sendLink = async (linkType: LinkType) => {
    if (!row?.payment_token) return;
    // Verify the corresponding amount is set BEFORE marking + copying link.
    const cents =
      linkType === "deposit"
        ? row.deposit_amount_cents
        : linkType === "balance"
          ? row.balance_due_cents
          : row.final_price_cents;
    if (!cents || cents < 100) {
      toast.error("Set the amount for this option before generating a link.");
      return;
    }

    const { error } = await supabase
      .from("estimate_requests")
      .update({
        last_payment_link_type: linkType,
        last_payment_link_sent_at: new Date().toISOString(),
      } as never)
      .eq("id", estimateId);
    if (error) {
      toast.error("Could not record link", { description: error.message });
      return;
    }

    const url = `${PUBLIC_SITE}/pay/${row.payment_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        `${linkType === "deposit" ? "Deposit" : linkType === "balance" ? "Balance" : "Full"} link copied`,
        { description: `Send to customer · ${publicCode}` },
      );
    } catch {
      toast.success("Link ready", { description: url });
    }
    load();
  };

  const copyToken = async () => {
    if (!row?.payment_token) return;
    const url = `${PUBLIC_SITE}/pay/${row.payment_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Payment link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading payment…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Payment
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] uppercase tracking-wider ${STATUS_BADGE[row?.payment_status ?? "unpaid"] ?? STATUS_BADGE.unpaid}`}
        >
          {(row?.payment_status ?? "unpaid").replace(/_/g, " ")}
        </Badge>
        {row?.paid_at && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {new Date(row.paid_at).toLocaleString()}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Final price (USD)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              onBlur={autoBalance}
              className="pl-7 tabular-nums"
              placeholder="450"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Deposit due now
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              onBlur={autoBalance}
              className="pl-7 tabular-nums"
              placeholder="180"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Balance on delivery
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="pl-7 tabular-nums"
              placeholder="270"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save amounts
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => sendLink("deposit")}>
          <Send className="h-3 w-3" /> Deposit link
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => sendLink("full")}>
          <Send className="h-3 w-3" /> Full payment link
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => sendLink("balance")}>
          <Send className="h-3 w-3" /> Final balance link
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={copyToken}>
          <Copy className="h-3 w-3" /> Copy URL
        </Button>
      </div>

      {row?.last_payment_link_type && row?.last_payment_link_sent_at && (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          Active link:{" "}
          <span className="font-medium text-foreground/80">
            {row.last_payment_link_type}
          </span>{" "}
          · sent {new Date(row.last_payment_link_sent_at).toLocaleString()}
        </div>
      )}
      {row?.stripe_payment_intent_id && (
        <div className="text-[10px] font-mono text-muted-foreground/70 truncate">
          PI: {row.stripe_payment_intent_id}
        </div>
      )}
    </div>
  );
};

export default EstimatePaymentPanel;
