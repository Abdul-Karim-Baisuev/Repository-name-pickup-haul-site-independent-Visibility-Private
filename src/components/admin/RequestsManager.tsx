import { useEffect, useMemo, useState } from "react";
import { History, Loader2, RefreshCw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AssignDriverControl } from "@/components/admin/AssignDriverControl";
import { EstimatePaymentPanel } from "@/components/admin/EstimatePaymentPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatUSPhone, telHref, lastFourDigits } from "@/lib/phone";
import { Copy, Link2 } from "lucide-react";

const STATUS_VALUES = ["new", "in_progress", "done", "canceled"] as const;
type Status = (typeof STATUS_VALUES)[number];

const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  in_progress: "In Progress",
  done: "Done",
  canceled: "Canceled",
};

const STATUS_BADGE_CLASS: Record<Status, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  canceled: "bg-muted text-muted-foreground border-border",
};

const ALL = "all";

type BookingRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  description: string;
  address: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: Status;
  admin_notes: string | null;
};

type EstimateRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string;
  service_type: string;
  service_direction: string;
  address: string;
  distance_miles: number;
  item_quantity: number;
  item_weight_lbs: number | null;
  item_dimensions: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  status: Status;
  admin_notes: string | null;
  public_code: string;
  tracking_token: string;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const StatusBadge = ({ status }: { status: Status }) => (
  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STATUS_BADGE_CLASS[status]}`}>
    {STATUS_LABEL[status]}
  </Badge>
);

interface StatusLog {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by_email: string | null;
  changed_at: string;
}

const StatusHistory = ({
  orderType,
  orderId,
  refreshKey,
}: {
  orderType: "booking" | "estimate";
  orderId: string;
  refreshKey: number;
}) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<StatusLog[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("order_status_logs")
      .select("id, old_status, new_status, changed_by_email, changed_at")
      .eq("order_type", orderType)
      .eq("order_id", orderId)
      .order("changed_at", { ascending: false })
      .limit(20);
    setLoading(false);
    if (error) {
      toast.error("Could not load history", { description: error.message });
      return;
    }
    setLogs(data as StatusLog[]);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refreshKey]);

  return (
    <div className="mt-3 rounded-md border border-border/50 bg-secondary/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <History className="h-3 w-3" /> Status history
        </span>
        <span className="text-foreground/60">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-border/50 px-3 py-2 text-xs">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-muted-foreground">No status changes recorded.</div>
          ) : (
            <ol className="space-y-1.5">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(l.changed_at).toLocaleString()}
                  </span>
                  <span className="text-foreground/80">
                    {(l.old_status ?? "—").replace(/_/g, " ")} →{" "}
                    <span className="font-medium text-primary">
                      {l.new_status.replace(/_/g, " ")}
                    </span>
                  </span>
                  {l.changed_by_email && (
                    <span className="text-muted-foreground">· {l.changed_by_email}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};

interface CardProps {
  title: string;
  meta: React.ReactNode;
  body: React.ReactNode;
  status: Status;
  notes: string;
  extra?: React.ReactNode;
  orderType: "booking" | "estimate";
  orderId: string;
  onSave: (status: Status, notes: string) => Promise<void>;
}

const RequestCard = ({ title, meta, body, status, notes, extra, orderType, orderId, onSave }: CardProps) => {
  const [draftStatus, setDraftStatus] = useState<Status>(status);
  const [draftNotes, setDraftNotes] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    setDraftStatus(status);
    setDraftNotes(notes);
  }, [status, notes]);

  const dirty = draftStatus !== status || draftNotes !== notes;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 shadow-glow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-semibold tracking-wide">{title}</h3>
            <StatusBadge status={status} />
          </div>
          <div className="text-xs text-muted-foreground">{meta}</div>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm">{body}</div>

      {extra && <div className="mt-3 pt-3 border-t border-border/50">{extra}</div>}

      <StatusHistory orderType={orderType} orderId={orderId} refreshKey={historyKey} />

      <div className="mt-4 grid gap-3 border-t border-border/50 pt-4 md:grid-cols-[180px_1fr_auto] md:items-start">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
          <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v as Status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Internal notes</Label>
          <Textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="Visible to admins only"
            rows={2}
            className="resize-y"
          />
        </div>
        <div className="md:pt-6">
          <Button
            type="button"
            disabled={!dirty || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(draftStatus, draftNotes);
                setHistoryKey((k) => k + 1);
              } finally {
                setSaving(false);
              }
            }}
            className="w-full font-heading tracking-wider md:w-auto"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

const TrackingLinkRow = ({ token, code }: { token: string | null; code: string }) => {
  if (!token) return null;
  const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ?? "https://www.autobais.app";
  const url = `${PUBLIC_SITE_URL}/track/${token}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tracking link copied", { description: `Code ${code}` });
    } catch {
      toast.error("Could not copy link");
    }
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-xs">
      <Link2 className="h-3.5 w-3.5 text-primary" />
      <span className="text-muted-foreground">Customer tracking:</span>
      <a
        href={`/track/${token}`}
        target="_blank"
        rel="noopener"
        className="truncate font-mono text-primary hover:underline max-w-[260px]"
        title={url}
      >
        /track/{token.slice(0, 10)}…
      </a>
      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={copy}>
        <Copy className="h-3 w-3 mr-1" /> Copy
      </Button>
    </div>
  );
};

const ALL_SERVICES_BOOKING = [
  "Assembly & Install",
  "Furniture Delivery",
  "Moving",
  "Junk Removal",
  "Construction",
  "Transport Only",
  "Other",
];

const ALL_SERVICES_ESTIMATE = [
  "Furniture & Appliance Delivery",
  "Store / Marketplace Pickup",
  "Small Move / Single Item",
  "Cabinet Delivery & Installation",
  "Assembly & Setup",
  "Materials / Equipment Delivery",
  // Legacy values — kept so old filter chips still work for historical requests
  "Moving",
  "Junk Removal",
  "Construction",
  "Transport Only",
];

interface FiltersProps {
  status: string;
  service: string;
  query: string;
  dateFrom: string;
  dateTo: string;
  services: string[];
  onChange: (k: "status" | "service" | "query" | "dateFrom" | "dateTo", v: string) => void;
  onReset: () => void;
}

const Filters = ({ status, service, query, dateFrom, dateTo, services, onChange, onReset }: FiltersProps) => (
  <div className="grid gap-3 rounded-xl border border-border bg-card/40 p-4 md:grid-cols-[1fr_180px_180px_160px_160px_auto]">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => onChange("query", e.target.value)}
        placeholder="Search name, phone, email, address…"
        className="pl-9"
      />
    </div>
    <Select value={status} onValueChange={(v) => onChange("status", v)}>
      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All statuses</SelectItem>
        {STATUS_VALUES.map((s) => (
          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={service} onValueChange={(v) => onChange("service", v)}>
      <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All services</SelectItem>
        {services.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Input type="date" value={dateFrom} onChange={(e) => onChange("dateFrom", e.target.value)} />
    <Input type="date" value={dateTo} onChange={(e) => onChange("dateTo", e.target.value)} />
    <Button type="button" variant="outline" onClick={onReset}>Reset</Button>
  </div>
);

const StatCard = ({ label, value, accent }: { label: string; value: number; accent?: string }) => (
  <div className="rounded-lg border border-border bg-card/60 p-3">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className={`mt-1 font-heading text-2xl font-semibold ${accent ?? ""}`}>{value}</div>
  </div>
);

interface ManagerProps {
  isAdmin: boolean;
}

export const RequestsManager = ({ isAdmin }: ManagerProps) => {
  const [tab, setTab] = useState<"bookings" | "estimates">("bookings");

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingEstimates, setLoadingEstimates] = useState(false);

  const [bFilter, setBFilter] = useState({ status: ALL, service: ALL, query: "", dateFrom: "", dateTo: "" });
  const [eFilter, setEFilter] = useState({ status: ALL, service: ALL, query: "", dateFrom: "", dateTo: "" });

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("id, created_at, name, email, phone, service_type, description, address, preferred_date, preferred_time, status, admin_notes")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBookings((data ?? []) as BookingRow[]);
    } catch (err) {
      console.error("loadBookings", err);
      toast.error("Failed to load booking requests");
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadEstimates = async () => {
    setLoadingEstimates(true);
    try {
      const { data, error } = await supabase
        .from("estimate_requests")
        .select("id, created_at, name, email, phone, service_type, service_direction, address, distance_miles, item_quantity, item_weight_lbs, item_dimensions, preferred_date, preferred_time, notes, status, admin_notes, public_code, tracking_token")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEstimates((data ?? []) as EstimateRow[]);
    } catch (err) {
      console.error("loadEstimates", err);
      toast.error("Failed to load estimate requests");
    } finally {
      setLoadingEstimates(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadBookings();
    loadEstimates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const matches = (
    f: { status: string; service: string; query: string; dateFrom: string; dateTo: string },
    row: { status: string; service_type: string; created_at: string; name?: string | null; email?: string | null; phone: string; address: string | null },
  ) => {
    if (f.status !== ALL && row.status !== f.status) return false;
    if (f.service !== ALL && row.service_type !== f.service) return false;
    if (f.dateFrom && new Date(row.created_at) < new Date(f.dateFrom + "T00:00:00")) return false;
    if (f.dateTo && new Date(row.created_at) > new Date(f.dateTo + "T23:59:59")) return false;
    if (f.query) {
      const q = f.query.toLowerCase();
      const hay = [row.name ?? "", row.email ?? "", row.phone, row.address ?? ""].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const filteredBookings = useMemo(() => bookings.filter((r) => matches(bFilter, r)), [bookings, bFilter]);
  const filteredEstimates = useMemo(() => estimates.filter((r) => matches(eFilter, r)), [estimates, eFilter]);

  const counts = (rows: { status: Status }[]) => ({
    total: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    in_progress: rows.filter((r) => r.status === "in_progress").length,
    done: rows.filter((r) => r.status === "done").length,
    canceled: rows.filter((r) => r.status === "canceled").length,
  });

  const bCounts = counts(filteredBookings);
  const eCounts = counts(filteredEstimates);

  const updateBooking = async (id: string, status: Status, admin_notes: string) => {
    const { error } = await supabase
      .from("booking_requests")
      .update({ status, admin_notes: admin_notes || null })
      .eq("id", id);
    if (error) {
      toast.error("Update failed");
      throw error;
    }
    setBookings((prev) => prev.map((r) => (r.id === id ? { ...r, status, admin_notes: admin_notes || null } : r)));
    toast.success("Updated");
  };

  const updateEstimate = async (id: string, status: Status, admin_notes: string) => {
    const { error } = await supabase
      .from("estimate_requests")
      .update({ status, admin_notes: admin_notes || null })
      .eq("id", id);
    if (error) {
      toast.error("Update failed");
      throw error;
    }
    setEstimates((prev) => prev.map((r) => (r.id === id ? { ...r, status, admin_notes: admin_notes || null } : r)));
    toast.success("Updated");
  };

  if (!isAdmin) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-glow-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold uppercase tracking-wider">Requests</h2>
          <p className="text-sm text-muted-foreground">Manage incoming booking and estimate submissions.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => (tab === "bookings" ? loadBookings() : loadEstimates())}
          className="font-heading tracking-wider"
        >
          <RefreshCw className={(tab === "bookings" ? loadingBookings : loadingEstimates) ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 md:w-auto">
          <TabsTrigger value="bookings">
            Bookings <span className="ml-2 text-xs text-muted-foreground">({bookings.length})</span>
          </TabsTrigger>
          <TabsTrigger value="estimates">
            Estimates <span className="ml-2 text-xs text-muted-foreground">({estimates.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Total" value={bCounts.total} />
            <StatCard label="New" value={bCounts.new} accent="text-primary" />
            <StatCard label="In Progress" value={bCounts.in_progress} accent="text-amber-400" />
            <StatCard label="Done" value={bCounts.done} accent="text-emerald-400" />
            <StatCard label="Canceled" value={bCounts.canceled} accent="text-muted-foreground" />
          </div>
          <Filters
            {...bFilter}
            services={ALL_SERVICES_BOOKING}
            onChange={(k, v) => setBFilter((p) => ({ ...p, [k]: v }))}
            onReset={() => setBFilter({ status: ALL, service: ALL, query: "", dateFrom: "", dateTo: "" })}
          />
          {loadingBookings ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-6">
              <Loader2 className="animate-spin text-primary" />
              <span className="text-muted-foreground">Loading bookings…</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
              No booking requests match the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((r) => (
                <RequestCard
                  key={r.id}
                  orderType="booking"
                  orderId={r.id}
                  status={r.status}
                  notes={r.admin_notes ?? ""}
                  onSave={(s, n) => updateBooking(r.id, s, n)}
                  title={`${r.name} · ${r.service_type}`}
                  meta={
                    <>
                      <span>{fmtDate(r.created_at)}</span>
                      {r.preferred_date && (
                        <>
                          {" · "}<span>Preferred: {r.preferred_date}{r.preferred_time ? ` (${r.preferred_time})` : ""}</span>
                        </>
                      )}
                    </>
                  }
                  body={
                    <>
                      <div className="grid gap-1 md:grid-cols-2">
                        <div><span className="text-muted-foreground">Phone:</span> <a href={telHref(r.phone)} className="text-primary hover:underline">{formatUSPhone(r.phone)}</a></div>
                        <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email}</a></div>
                        {r.address && <div className="md:col-span-2"><span className="text-muted-foreground">Address:</span> {r.address}</div>}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/40 p-3 text-sm text-foreground/90">
                        {r.description}
                      </div>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="estimates" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Total" value={eCounts.total} />
            <StatCard label="New" value={eCounts.new} accent="text-primary" />
            <StatCard label="In Progress" value={eCounts.in_progress} accent="text-amber-400" />
            <StatCard label="Done" value={eCounts.done} accent="text-emerald-400" />
            <StatCard label="Canceled" value={eCounts.canceled} accent="text-muted-foreground" />
          </div>
          <Filters
            {...eFilter}
            services={ALL_SERVICES_ESTIMATE}
            onChange={(k, v) => setEFilter((p) => ({ ...p, [k]: v }))}
            onReset={() => setEFilter({ status: ALL, service: ALL, query: "", dateFrom: "", dateTo: "" })}
          />
          {loadingEstimates ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-6">
              <Loader2 className="animate-spin text-primary" />
              <span className="text-muted-foreground">Loading estimates…</span>
            </div>
          ) : filteredEstimates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
              No estimate requests match the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEstimates.map((r) => (
                <RequestCard
                  key={r.id}
                  orderType="estimate"
                  orderId={r.id}
                  status={r.status}
                  notes={r.admin_notes ?? ""}
                  onSave={(s, n) => updateEstimate(r.id, s, n)}
                  extra={
                    <div className="space-y-4">
                      <EstimatePaymentPanel estimateId={r.id} publicCode={r.public_code} />
                      <AssignDriverControl estimateRequestId={r.id} publicCode={r.public_code} />
                    </div>
                  }
                  title={`${r.name ?? "Anonymous"} · ${r.service_type}`}
                  meta={
                    <>
                      <span>{fmtDate(r.created_at)}</span>
                      {" · "}
                      <span>{r.distance_miles} mi</span>
                      {" · "}
                      <span>{r.service_direction}</span>
                      {r.preferred_date && (
                        <>
                          {" · "}<span>Preferred: {r.preferred_date}{r.preferred_time ? ` (${r.preferred_time})` : ""}</span>
                        </>
                      )}
                    </>
                  }
                  body={
                    <>
                      <div className="grid gap-1 md:grid-cols-2">
                        <div><span className="text-muted-foreground">Phone:</span> <a href={telHref(r.phone)} className="text-primary hover:underline">{formatUSPhone(r.phone)}</a> <span className="text-muted-foreground">· last4 {lastFourDigits(r.phone)}</span></div>
                        {r.email && <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email}</a></div>}
                        <div className="md:col-span-2"><span className="text-muted-foreground">Address:</span> {r.address}</div>
                        <div><span className="text-muted-foreground">Qty:</span> {r.item_quantity}{r.item_weight_lbs ? ` · ${r.item_weight_lbs} lb` : ""}</div>
                        {r.item_dimensions && <div><span className="text-muted-foreground">Dimensions:</span> {r.item_dimensions}</div>}
                      </div>
                      {r.notes && (
                        <div className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/40 p-3 text-sm text-foreground/90">
                          {r.notes}
                        </div>
                      )}
                      <TrackingLinkRow token={r.tracking_token} code={r.public_code} />
                    </>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequestsManager;
