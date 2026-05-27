import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CheckCircle2, Download, FileSpreadsheet, FlaskConical, Loader2, LogOut, MessageCircle, RefreshCw, Rocket, Save, Send, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RequestsManager } from "@/components/admin/RequestsManager";
import { StripeWebhookPanel } from "@/components/admin/StripeWebhookPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EstimateRequest = {
  id: string;
  created_at: string;
  address: string;
  phone: string;
  service_type: string;
  distance_miles: number;
  status: string;
};

type TelegramSendLog = {
  id: string;
  created_at: string;
  source: string;
  chat_id: string | null;
  estimate_request_id: string | null;
  status: string;
  message_id: number | null;
  error: string | null;
  http_status: number | null;
};

type EstimateRequestInsert = Database["public"]["Tables"]["estimate_requests"]["Insert"];
type FunctionErrorResponse = { error?: string };
type ExportMode = "csv" | "excel";
type PublishCheckStatus = "pass" | "warn" | "fail";

type PublishCheck = {
  label: string;
  detail: string;
  status: PublishCheckStatus;
};

export const exportColumns = ["Created", "Address", "Phone", "Service", "Distance Miles", "Status", "ID"];
const ALL_FILTER_VALUE = "all";
const LOCAL_TIME_ZONE_VALUE = "local";
const SPECIFIC_TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "UTC",
];

const exportPhonePattern = /^\+?[0-9\s().-]+$/;

export const isValidPhoneForCrmExport = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  return trimmed === "" || (digits.length >= 7 && digits.length <= 25 && exportPhonePattern.test(trimmed));
};

export const normalizePhoneForCrm = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
};

const getUserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return zonedAsUtc - date.getTime();
};

const addDaysToDateValue = (dateValue: string, days: number) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const zonedDateTimeToUtcMs = (dateValue: string, timeZone: string) => {
  const [year, month, day] = dateValue.split("-").map(Number);
  const localTimeAsUtc = Date.UTC(year, month - 1, day);
  const firstPass = localTimeAsUtc - getTimeZoneOffsetMs(new Date(localTimeAsUtc), timeZone);

  return localTimeAsUtc - getTimeZoneOffsetMs(new Date(firstPass), timeZone);
};

export const getDateRangeBounds = (fromDate: string, toDate: string, timeZone = getUserTimeZone()) => ({
  fromTime: fromDate ? zonedDateTimeToUtcMs(fromDate, timeZone) : null,
  toTime: toDate ? zonedDateTimeToUtcMs(addDaysToDateValue(toDate, 1), timeZone) - 1 : null,
});

export const isCreatedAtWithinDateRange = (createdAt: string, fromDate: string, toDate: string, timeZone = getUserTimeZone()) => {
  const { fromTime, toTime } = getDateRangeBounds(fromDate, toDate, timeZone);
  const createdTime = new Date(createdAt).getTime();

  return (fromTime === null || createdTime >= fromTime) && (toTime === null || createdTime <= toTime);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const getPublishReadinessChecks = (): PublishCheck[] => [
  {
    label: "Production build mode",
    detail: import.meta.env.PROD
      ? "This app is running from a production bundle."
      : "Preview is running in development mode; Lovable will run the production build when you publish.",
    status: import.meta.env.PROD ? "pass" : "warn",
  },
  {
    label: "Cloud URL configured",
    detail: import.meta.env.VITE_SUPABASE_URL ? "Backend URL is available to the frontend." : "Missing backend URL configuration.",
    status: import.meta.env.VITE_SUPABASE_URL ? "pass" : "fail",
  },
  {
    label: "Publishable key configured",
    detail: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ? "Public backend key is available to the frontend."
      : "Missing public backend key configuration.",
    status: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "pass" : "fail",
  },
  {
    label: "Network available",
    detail: navigator.onLine ? "Browser reports an active network connection." : "Browser is offline.",
    status: navigator.onLine ? "pass" : "fail",
  },
];

export const toRows = (requests: EstimateRequest[]) =>
  requests.map((request) => ({
    Created: formatDate(request.created_at),
    Address: request.address,
    Phone: isValidPhoneForCrmExport(request.phone) ? normalizePhoneForCrm(request.phone) : "",
    Service: request.service_type,
    "Distance Miles": request.distance_miles,
    Status: request.status,
    ID: request.id,
  }));

type ExportRow = ReturnType<typeof toRows>[number];

const escapeCsvValue = (value: unknown) => {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
};

export const toCsvContent = (rows: ExportRow[]) =>
  [
    exportColumns.join(","),
    ...rows.map((row) => exportColumns.map((column) => escapeCsvValue(row[column as keyof ExportRow])).join(",")),
  ].join("\n");

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const toExcelHtml = (rows: ExportRow[]) =>
  `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${exportColumns
    .map((column) => `<th>${escapeHtml(column)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${exportColumns
          .map((column) => `<td>${escapeHtml(row[column as keyof ExportRow])}</td>`)
          .join("")}</tr>`,
    )
    .join("")}</tbody></table></body></html>`;

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [exportMode, setExportMode] = useState<ExportMode | null>(null);
  const [previewStatusFilter, setPreviewStatusFilter] = useState(ALL_FILTER_VALUE);
  const [previewServiceFilter, setPreviewServiceFilter] = useState(ALL_FILTER_VALUE);
  const [previewPhoneQuery, setPreviewPhoneQuery] = useState("");
  const [previewDateFrom, setPreviewDateFrom] = useState("");
  const [previewDateTo, setPreviewDateTo] = useState("");
  const [previewTimeZoneFilter, setPreviewTimeZoneFilter] = useState(LOCAL_TIME_ZONE_VALUE);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requests, setRequests] = useState<EstimateRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [publishChecks, setPublishChecks] = useState<PublishCheck[]>([]);
  const [publishCheckedAt, setPublishCheckedAt] = useState<string | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramSavedChatId, setTelegramSavedChatId] = useState<string | null>(null);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [waTemplate, setWaTemplate] = useState("");
  const [waTemplateSaved, setWaTemplateSaved] = useState<string | null>(null);
  const [isSavingWaTemplate, setIsSavingWaTemplate] = useState(false);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);
  const [isRunningPipelineTest, setIsRunningPipelineTest] = useState(false);
  const [discoveredChats, setDiscoveredChats] = useState<{ id: number; type: string; title: string }[]>([]);
  const [telegramLogs, setTelegramLogs] = useState<TelegramSendLog[]>([]);
  const [isLoadingTelegramLogs, setIsLoadingTelegramLogs] = useState(false);
  const [telegramLogsTotal, setTelegramLogsTotal] = useState(0);
  const [telegramLogsPage, setTelegramLogsPage] = useState(0);
  const [telegramLogsPageSize, setTelegramLogsPageSize] = useState(20);
  const [telegramLogsSourceFilter, setTelegramLogsSourceFilter] = useState(ALL_FILTER_VALUE);
  const [telegramLogsStatusFilter, setTelegramLogsStatusFilter] = useState(ALL_FILTER_VALUE);
  const [telegramLogsChatIdFilter, setTelegramLogsChatIdFilter] = useState("");
  const [isExportingTelegramLogs, setIsExportingTelegramLogs] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ loaded: number; total: number } | null>(null);

  const exportRows = useMemo(() => toRows(requests), [requests]);
  const userTimeZone = useMemo(() => getUserTimeZone(), []);
  const previewTimeZone = previewTimeZoneFilter === LOCAL_TIME_ZONE_VALUE ? userTimeZone : previewTimeZoneFilter;
  const statusOptions = useMemo(() => Array.from(new Set(requests.map((request) => request.status))).sort(), [requests]);
  const serviceOptions = useMemo(
    () => Array.from(new Set(requests.map((request) => request.service_type))).sort(),
    [requests],
  );
  const exportPreviewRows = useMemo(
    () =>
      requests.map((request) => ({
        id: request.id,
        createdAt: request.created_at,
        created: formatDate(request.created_at),
        address: request.address,
        originalPhone: request.phone,
        normalizedPhone: isValidPhoneForCrmExport(request.phone) ? normalizePhoneForCrm(request.phone) : "",
        service: request.service_type,
        status: request.status,
      })),
    [requests],
  );
  const filteredPreviewRows = useMemo(() => {
    const phoneQuery = previewPhoneQuery.trim().toLowerCase();
    const phoneDigits = previewPhoneQuery.replace(/\D/g, "");

    return exportPreviewRows.filter((row) => {
      const statusMatches = previewStatusFilter === ALL_FILTER_VALUE || row.status === previewStatusFilter;
      const serviceMatches = previewServiceFilter === ALL_FILTER_VALUE || row.service === previewServiceFilter;
      const dateMatches = isCreatedAtWithinDateRange(row.createdAt, previewDateFrom, previewDateTo, previewTimeZone);
      const originalDigits = row.originalPhone.replace(/\D/g, "");
      const normalizedDigits = row.normalizedPhone.replace(/\D/g, "");
      const phoneMatches =
        !phoneQuery ||
        row.originalPhone.toLowerCase().includes(phoneQuery) ||
        row.normalizedPhone.toLowerCase().includes(phoneQuery) ||
        (!!phoneDigits && (originalDigits.includes(phoneDigits) || normalizedDigits.includes(phoneDigits)));

      return statusMatches && serviceMatches && dateMatches && phoneMatches;
    });
  }, [exportPreviewRows, previewDateFrom, previewDateTo, previewPhoneQuery, previewServiceFilter, previewStatusFilter, previewTimeZone]);
  const filteredExportRows = useMemo(
    () => toRows(requests.filter((request) => filteredPreviewRows.some((row) => row.id === request.id))),
    [filteredPreviewRows, requests],
  );

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsCheckingAccess(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      setRequests([]);
      return;
    }

    const loadAdminData = async () => {
      setIsCheckingAccess(true);
      const { data: hasAccess, error: roleError } = await supabase.rpc("claim_admin_if_none");

      if (roleError || !hasAccess) {
        setIsAdmin(false);
        setIsCheckingAccess(false);
        toast.error("Admin access required", {
          description: "This account does not have permission to export requests.",
        });
        return;
      }

      setIsAdmin(true);
      setIsLoadingRequests(true);

      const { data, error } = await supabase
        .from("estimate_requests")
        .select("id, created_at, address, phone, service_type, distance_miles, status")
        .order("created_at", { ascending: false });

      setIsLoadingRequests(false);
      setIsCheckingAccess(false);

      if (error) {
        toast.error("Could not load requests", {
          description: "Please refresh the page and try again.",
        });
        return;
      }

      setRequests((data || []) as EstimateRequest[]);

      const { data: settingRows } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["telegram_chat_id", "whatsapp_message_template"]);
      const rows: { key: string; value: string | null }[] = settingRows ?? [];
      const tg = rows.find((r) => r.key === "telegram_chat_id");
      if (tg?.value) {
        setTelegramSavedChatId(tg.value);
        setTelegramChatId(tg.value);
      }
      const wa = rows.find((r) => r.key === "whatsapp_message_template");
      if (wa?.value) {
        setWaTemplateSaved(wa.value);
        setWaTemplate(wa.value);
      }
    };

    loadAdminData();
  }, [session]);

  useEffect(() => {
    if (!isAdmin) return;
    loadTelegramLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, telegramLogsPage, telegramLogsPageSize, telegramLogsSourceFilter, telegramLogsStatusFilter, telegramLogsChatIdFilter]);

  const loadTelegramLogs = async () => {
    setIsLoadingTelegramLogs(true);
    const from = telegramLogsPage * telegramLogsPageSize;
    const to = from + telegramLogsPageSize - 1;
    let query = supabase
      .from("telegram_send_logs")
      .select("id, created_at, source, chat_id, estimate_request_id, status, message_id, error, http_status", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (telegramLogsSourceFilter !== ALL_FILTER_VALUE) {
      query = query.eq("source", telegramLogsSourceFilter);
    }
    if (telegramLogsStatusFilter !== ALL_FILTER_VALUE) {
      query = query.eq("status", telegramLogsStatusFilter);
    }
    const chatIdQuery = telegramLogsChatIdFilter.trim();
    if (chatIdQuery) {
      query = query.ilike("chat_id", `%${chatIdQuery}%`);
    }

    const { data, error, count } = await query;
    setIsLoadingTelegramLogs(false);
    if (error) {
      toast.error("Could not load Telegram logs", { description: error.message });
      return;
    }
    setTelegramLogs((data ?? []) as TelegramSendLog[]);
    setTelegramLogsTotal(count ?? 0);
  };

  const exportTelegramLogsCsv = async (scope: "page" | "all") => {
    setIsExportingTelegramLogs(true);
    const expectedTotal = scope === "page" ? telegramLogs.length : telegramLogsTotal;
    setExportProgress({ loaded: 0, total: expectedTotal });

    const toastId = toast.loading(
      scope === "page"
        ? `Preparing export — 0 / ${expectedTotal}`
        : `Exporting logs — 0 / ${expectedTotal}`,
      { description: "Fetching matching rows…" },
    );

    try {
      let rows: TelegramSendLog[] = [];

      if (scope === "page") {
        rows = telegramLogs;
        setExportProgress({ loaded: rows.length, total: expectedTotal });
        toast.loading(`Preparing export — ${rows.length} / ${expectedTotal}`, {
          id: toastId,
          description: "Building CSV…",
        });
      } else {
        // Fetch all matching rows in chunks to bypass the 1000-row limit
        const CHUNK = 1000;
        let offset = 0;
        while (true) {
          let q = supabase
            .from("telegram_send_logs")
            .select("id, created_at, source, chat_id, estimate_request_id, status, message_id, error, http_status")
            .order("created_at", { ascending: false })
            .range(offset, offset + CHUNK - 1);

          if (telegramLogsSourceFilter !== ALL_FILTER_VALUE) q = q.eq("source", telegramLogsSourceFilter);
          if (telegramLogsStatusFilter !== ALL_FILTER_VALUE) q = q.eq("status", telegramLogsStatusFilter);
          const chatIdQuery = telegramLogsChatIdFilter.trim();
          if (chatIdQuery) q = q.ilike("chat_id", `%${chatIdQuery}%`);

          const { data, error } = await q;
          if (error) {
            toast.error("Export failed", { id: toastId, description: error.message });
            return;
          }
          const batch = (data ?? []) as TelegramSendLog[];
          rows.push(...batch);

          const loaded = rows.length;
          const total = Math.max(expectedTotal, loaded);
          setExportProgress({ loaded, total });
          const pct = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
          toast.loading(`Exporting logs — ${loaded} / ${total} (${pct}%)`, {
            id: toastId,
            description: "Fetching matching rows…",
          });

          if (batch.length < CHUNK) break;
          offset += CHUNK;
        }
      }

      if (!rows.length) {
        toast.info("Nothing to export", { id: toastId, description: undefined });
        return;
      }

      const columns = [
        "Created (ISO)",
        "Created (Local)",
        "Status",
        "Source",
        "Chat ID",
        "HTTP Status",
        "Message ID",
        "Estimate Request ID",
        "Error",
        "Log ID",
      ];
      const csvLines = [
        columns.join(","),
        ...rows.map((r) =>
          [
            r.created_at,
            formatDate(r.created_at),
            r.status,
            r.source,
            r.chat_id,
            r.http_status,
            r.message_id,
            r.estimate_request_id,
            r.error,
            r.id,
          ]
            .map(escapeCsvValue)
            .join(","),
        ),
      ];
      const filterTag = [
        telegramLogsSourceFilter !== ALL_FILTER_VALUE ? telegramLogsSourceFilter : null,
        telegramLogsStatusFilter !== ALL_FILTER_VALUE ? telegramLogsStatusFilter : null,
        telegramLogsChatIdFilter.trim() ? `chat-${telegramLogsChatIdFilter.trim()}` : null,
        scope === "page" ? `page-${telegramLogsPage + 1}` : "all",
      ]
        .filter(Boolean)
        .join("_")
        .replace(/[^a-zA-Z0-9._-]/g, "-");
      const filename = `telegram-send-logs_${filterTag || "export"}.csv`;
      downloadBlob(new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" }), filename);
      toast.success(`Exported ${rows.length} log${rows.length === 1 ? "" : "s"}`, {
        id: toastId,
        description: filename,
      });
    } finally {
      setIsExportingTelegramLogs(false);
      setExportProgress(null);
    }
  };

  const handleSaveTelegramChatId = async () => {
    const trimmed = telegramChatId.trim();
    if (!trimmed) {
      toast.error("Enter a chat ID");
      return;
    }
    setIsSavingTelegram(true);
    const { error } = await supabase.from("app_settings").upsert(
      { key: "telegram_chat_id", value: trimmed },
      { onConflict: "key" },
    );
    setIsSavingTelegram(false);
    if (error) {
      toast.error("Could not save chat ID", { description: error.message });
      return;
    }
    setTelegramSavedChatId(trimmed);
    toast.success("Telegram chat ID saved");
  };

  const handleSaveWaTemplate = async () => {
    const trimmed = waTemplate.trim();
    if (!trimmed) {
      toast.error("Enter a message template");
      return;
    }
    if (trimmed.length > 600) {
      toast.error("Template too long", { description: "Max 600 characters." });
      return;
    }
    setIsSavingWaTemplate(true);
    const { error } = await supabase.from("app_settings").upsert(
      { key: "whatsapp_message_template", value: trimmed },
      { onConflict: "key" },
    );
    setIsSavingWaTemplate(false);
    if (error) {
      toast.error("Could not save template", { description: error.message });
      return;
    }
    setWaTemplateSaved(trimmed);
    toast.success("WhatsApp template saved");
  };

  const handleFetchTelegramChats = async () => {
    setIsFetchingChats(true);
    setDiscoveredChats([]);
    const { data, error } = await supabase.functions.invoke("telegram-get-updates");
    setIsFetchingChats(false);
    if (error) {
      toast.error("Could not fetch updates", { description: error.message });
      return;
    }
    const chats = (data?.chats ?? []) as { id: number; type: string; title: string }[];
    setDiscoveredChats(chats);
    if (chats.length === 0) {
      toast.info("No chats found", {
        description: "Send a message to your bot from the chat you want to use, then try again.",
      });
    } else {
      toast.success(`Found ${chats.length} chat${chats.length === 1 ? "" : "s"}`);
    }
  };

  const handleSendTestTelegram = async () => {
    const trimmed = telegramChatId.trim();
    if (!trimmed) {
      toast.error("Enter a chat ID first");
      return;
    }
    setIsSendingTestMessage(true);
    const { data, error } = await supabase.functions.invoke("telegram-send-test", {
      body: { chat_id: trimmed },
    });
    setIsSendingTestMessage(false);
    if (error || (data && data.error)) {
      toast.error("Test message failed", {
        description: (data?.error as string) || error?.message || "Unknown error",
      });
      loadTelegramLogs();
      return;
    }
    toast.success("Test message sent", {
      description: `Check Telegram chat ${trimmed} for the test message.`,
    });
    loadTelegramLogs();
  };

  const handleTestSaveAndNotify = async () => {
    if (!telegramSavedChatId) {
      toast.error("Save a chat ID first", {
        description: "Configure Telegram chat ID before running the pipeline test.",
      });
      return;
    }
    setIsRunningPipelineTest(true);

    const testRow = {
      address: "TEST — Admin pipeline check (Van Nuys, CA)",
      phone: "+17473706885",
      service_type: "Materials / Equipment Delivery",
      service_direction: "both",
      distance_miles: 5,
      stops: ["TEST Point A — 6230 Sepulveda Blvd, Van Nuys, CA", "TEST Point B — 100 Universal City Plaza, Universal City, CA"],
      item_quantity: 1,
      notes: `Pipeline test from Admin at ${new Date().toISOString()}`,
      status: "new",
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("estimate_requests")
      .insert(testRow as unknown as EstimateRequestInsert)
      .select("id")
      .single();

    if (insertErr || !inserted) {
      setIsRunningPipelineTest(false);
      toast.error("Test insert failed", { description: insertErr?.message ?? "Unknown error" });
      return;
    }

    const { data, error } = await supabase.functions.invoke("notify-telegram", {
      body: { estimate_request_id: inserted.id, is_test: true },
    });

    setIsRunningPipelineTest(false);

    const responseError = (data as FunctionErrorResponse | null)?.error;
    if (error || responseError) {
      toast.error("Saved, but Telegram notification failed", {
        description:
          responseError ||
          error?.message ||
          "Check edge function logs for notify-telegram.",
      });
      // Refresh table so the test row is visible
      const { data: refreshed } = await supabase
        .from("estimate_requests")
        .select("id, created_at, address, phone, service_type, distance_miles, status")
        .order("created_at", { ascending: false });
      if (refreshed) setRequests(refreshed as EstimateRequest[]);
      loadTelegramLogs();
      return;
    }

    toast.success("Pipeline OK — request saved & Telegram delivered", {
      description: `Test request ${inserted.id.slice(0, 8)}… sent to chat ${telegramSavedChatId}.`,
    });

    const { data: refreshed } = await supabase
      .from("estimate_requests")
      .select("id, created_at, address, phone, service_type, distance_miles, status")
      .order("created_at", { ascending: false });
    if (refreshed) setRequests(refreshed as EstimateRequest[]);
    loadTelegramLogs();
  };

  const handleEmailAuth = async (mode: "signin" | "signup") => {
    if (!email || password.length < 6) {
      toast.error("Enter email and password", {
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setIsSigningIn(true);
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
    setIsSigningIn(false);

    if (result.error) {
      toast.error(mode === "signin" ? "Could not sign in" : "Could not create account", {
        description: result.error.message,
      });
      return;
    }

    toast.success(mode === "signin" ? "Signed in" : "Check your email", {
      description:
        mode === "signin"
          ? "Loading estimate requests now."
          : "Confirm your email, then return to this admin page.",
    });
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/admin",
    });
    setIsSigningIn(false);

    if (result.error) {
      toast.error("Google sign in failed", {
        description: result.error.message,
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  const resetPreviewFilters = () => {
    setPreviewStatusFilter(ALL_FILTER_VALUE);
    setPreviewServiceFilter(ALL_FILTER_VALUE);
    setPreviewPhoneQuery("");
    setPreviewDateFrom("");
    setPreviewDateTo("");
    setPreviewTimeZoneFilter(LOCAL_TIME_ZONE_VALUE);
  };

  const closeExportPreview = () => {
    setExportMode(null);
    resetPreviewFilters();
  };

  const exportCsv = (rows = exportRows) => {
    if (!rows.length) return;
    downloadBlob(new Blob([toCsvContent(rows)], { type: "text/csv;charset=utf-8" }), "request-estimates.csv");
  };

  const exportExcel = (rows = exportRows) => {
    if (!rows.length) return;
    downloadBlob(
      new Blob([toExcelHtml(rows)], { type: "application/vnd.ms-excel;charset=utf-8" }),
      "request-estimates.xls",
    );
  };

  const confirmExport = () => {
    if (!filteredExportRows.length) return;
    if (exportMode === "csv") exportCsv(filteredExportRows);
    if (exportMode === "excel") exportExcel(filteredExportRows);
    closeExportPreview();
  };

  const handleCheckPublishStatus = () => {
    const checks = getPublishReadinessChecks();
    setPublishChecks(checks);
    setPublishCheckedAt(new Date().toLocaleTimeString());

    if (checks.some((check) => check.status === "fail")) {
      toast.error("Publish check needs attention", {
        description: "Fix failed prerequisites before publishing.",
      });
      return;
    }

    toast.success("Publish prerequisites checked", {
      description: checks.some((check) => check.status === "warn")
        ? "Warnings are informational in preview mode."
        : "Ready to publish.",
    });
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-foreground">
        <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col justify-center">
          <div className="rounded-xl border border-border bg-card p-6 shadow-glow-card md:p-8">
            <div className="mb-8 space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Admin Export</h1>
              <p className="text-sm text-muted-foreground">Sign in to download Request Estimate leads for your CRM.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button className="w-full font-heading tracking-wider" disabled={isSigningIn} onClick={() => handleEmailAuth("signin")}>
                {isSigningIn ? <Loader2 className="animate-spin" /> : null}
                Sign In
              </Button>
              <Button className="w-full font-heading tracking-wider" variant="outline" disabled={isSigningIn} onClick={() => handleEmailAuth("signup")}>
                Create Admin Account
              </Button>
              <Button className="w-full font-heading tracking-wider" variant="secondary" disabled={isSigningIn} onClick={handleGoogleSignIn}>
                Continue with Google
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary">
              Admin area
            </div>
            <h1 className="text-4xl font-bold md:text-5xl">Request Estimate Export</h1>
            <p className="max-w-2xl text-muted-foreground">Download submitted pricing requests as CSV or Excel for CRM import.</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full font-heading tracking-wider md:w-auto">
            <LogOut />
            Sign Out
          </Button>
        </div>

        {isCheckingAccess ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-glow-card">
            <Loader2 className="animate-spin text-primary" />
            <span className="text-muted-foreground">Checking admin access...</span>
          </div>
        ) : !isAdmin ? (
          <div className="rounded-xl border border-border bg-card p-6 shadow-glow-card">
            <h2 className="text-2xl font-bold">Access denied</h2>
            <p className="mt-2 text-muted-foreground">This account is not assigned as an admin.</p>
          </div>
        ) : (
          <>
            <RequestsManager isAdmin={isAdmin} />

            <StripeWebhookPanel />

            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div className="rounded-xl border border-border bg-card p-5 shadow-glow-card">
                <p className="text-sm text-muted-foreground">Total requests</p>
                <p className="mt-1 text-4xl font-bold font-heading">{requests.length}</p>
              </div>
              <Button disabled={!requests.length} onClick={() => setExportMode("csv")} size="lg" className="font-heading tracking-wider">
                <Download />
                Export CSV
              </Button>
              <Button disabled={!requests.length} onClick={() => setExportMode("excel")} size="lg" variant="secondary" className="font-heading tracking-wider">
                <FileSpreadsheet />
                Export Excel
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-glow-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Publish Readiness</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check local prerequisites before using Lovable Publish.
                  </p>
                </div>
                <Button onClick={handleCheckPublishStatus} variant="outline" className="font-heading tracking-wider">
                  <Rocket />
                  Check publish status
                </Button>
              </div>

              {publishChecks.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {publishChecks.map((check) => {
                    const Icon = check.status === "pass" ? CheckCircle2 : check.status === "warn" ? ShieldCheck : XCircle;

                    return (
                      <div key={check.label} className="flex gap-3 rounded-lg border border-border bg-secondary/40 p-4">
                        <Icon
                          className={
                            check.status === "pass"
                              ? "mt-0.5 text-primary"
                              : check.status === "warn"
                                ? "mt-0.5 text-muted-foreground"
                                : "mt-0.5 text-destructive"
                          }
                        />
                        <div>
                          <p className="font-medium">{check.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-sm text-muted-foreground md:col-span-2">Last checked: {publishCheckedAt}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-glow-card">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">WhatsApp Message Template</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Default text used by the floating WhatsApp button. Visitors can still tweak it before sending.
                    </p>
                  </div>
                </div>
                {waTemplateSaved ? (
                  <span className="inline-flex items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Saved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Using default
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <Label htmlFor="wa-template">Message template</Label>
                <Textarea
                  id="wa-template"
                  rows={4}
                  value={waTemplate}
                  onChange={(event) => setWaTemplate(event.target.value.slice(0, 600))}
                  placeholder="Hi! I'd like to ask about a pickup truck hauling job."
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Plain text only. Visible to all site visitors.</span>
                  <span>{waTemplate.length}/600</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveWaTemplate}
                  disabled={isSavingWaTemplate || !waTemplate.trim() || waTemplate.trim() === waTemplateSaved}
                  className="font-heading tracking-wider"
                >
                  {isSavingWaTemplate ? <Loader2 className="animate-spin" /> : <Save />}
                  Save template
                </Button>
                {waTemplateSaved && waTemplate.trim() !== waTemplateSaved && (
                  <Button
                    onClick={() => setWaTemplate(waTemplateSaved)}
                    variant="outline"
                    className="font-heading tracking-wider"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-glow-card">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Telegram Notifications</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Set the chat that receives new estimate requests. Enter a chat ID manually, or auto-detect by sending a message to your bot first.
                    </p>
                  </div>
                </div>
                {telegramSavedChatId ? (
                  <span className="inline-flex items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active: {telegramSavedChatId}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Not configured
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="telegram-chat-id">Telegram chat ID</Label>
                  <Input
                    id="telegram-chat-id"
                    inputMode="text"
                    value={telegramChatId}
                    onChange={(event) => setTelegramChatId(event.target.value)}
                    placeholder="e.g. 123456789 or -1001234567890"
                  />
                </div>
                <Button onClick={handleSaveTelegramChatId} disabled={isSavingTelegram} className="font-heading tracking-wider">
                  {isSavingTelegram ? <Loader2 className="animate-spin" /> : <Save />}
                  Save
                </Button>
                <Button onClick={handleFetchTelegramChats} disabled={isFetchingChats} variant="outline" className="font-heading tracking-wider">
                  {isFetchingChats ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  Get via getUpdates
                </Button>
                <Button
                  onClick={handleSendTestTelegram}
                  disabled={isSendingTestMessage || !telegramChatId.trim()}
                  variant="secondary"
                  className="font-heading tracking-wider"
                >
                  {isSendingTestMessage ? <Loader2 className="animate-spin" /> : <Send />}
                  Send test message
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-border bg-secondary/30 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">End-to-end pipeline test</p>
                    <p className="text-xs text-muted-foreground">
                      Inserts a clearly-marked TEST estimate request into the database, then triggers the same notify-telegram handler that runs after real form submissions. Confirms save + delivery in one step.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleTestSaveAndNotify}
                  disabled={isRunningPipelineTest || !telegramSavedChatId}
                  className="font-heading tracking-wider"
                >
                  {isRunningPipelineTest ? <Loader2 className="animate-spin" /> : <FlaskConical />}
                  Test save & notify
                </Button>
              </div>

              {discoveredChats.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-medium">Detected chats — click to use:</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {discoveredChats.map((chat) => {
                      const isActive = telegramChatId.trim() === String(chat.id);
                      return (
                        <button
                          type="button"
                          key={chat.id}
                          onClick={() => setTelegramChatId(String(chat.id))}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                            isActive ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:border-primary/40"
                          }`}
                        >
                          <div>
                            <p className="font-medium">{chat.title}</p>
                            <p className="text-xs text-muted-foreground">{chat.type} · ID {chat.id}</p>
                          </div>
                          {isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Tip: open your bot in Telegram, send any message (or add it to a group and send a message there), then press <strong>Get via getUpdates</strong>. Telegram only keeps recent messages — if nothing appears, send a fresh message and retry.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-glow-card">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Send className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Telegram Send Logs</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Attempts to deliver Telegram messages. Filter by source, status, or chat ID.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 self-start">
                  <Button
                    onClick={loadTelegramLogs}
                    disabled={isLoadingTelegramLogs}
                    variant="outline"
                    className="font-heading tracking-wider"
                  >
                    {isLoadingTelegramLogs ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    Refresh
                  </Button>
                  <Button
                    onClick={() => exportTelegramLogsCsv("page")}
                    disabled={isExportingTelegramLogs || isLoadingTelegramLogs || telegramLogs.length === 0}
                    variant="secondary"
                    className="font-heading tracking-wider"
                  >
                    {isExportingTelegramLogs ? <Loader2 className="animate-spin" /> : <Download />}
                    {isExportingTelegramLogs && exportProgress
                      ? `Exporting ${exportProgress.loaded}/${exportProgress.total}`
                      : "Export page"}
                  </Button>
                  <Button
                    onClick={() => exportTelegramLogsCsv("all")}
                    disabled={isExportingTelegramLogs || isLoadingTelegramLogs || telegramLogsTotal === 0}
                    className="font-heading tracking-wider"
                  >
                    {isExportingTelegramLogs ? <Loader2 className="animate-spin" /> : <Download />}
                    {isExportingTelegramLogs && exportProgress
                      ? `Exporting ${exportProgress.loaded}/${exportProgress.total}`
                      : `Export all (${telegramLogsTotal})`}
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="logs-source-filter">Source</Label>
                  <Select
                    value={telegramLogsSourceFilter}
                    onValueChange={(value) => {
                      setTelegramLogsSourceFilter(value);
                      setTelegramLogsPage(0);
                    }}
                  >
                    <SelectTrigger id="logs-source-filter">
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>All sources</SelectItem>
                      <SelectItem value="notify-telegram">notify-telegram</SelectItem>
                      <SelectItem value="notify-telegram:test">notify-telegram:test</SelectItem>
                      <SelectItem value="telegram-send-test">telegram-send-test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logs-status-filter">Status</Label>
                  <Select
                    value={telegramLogsStatusFilter}
                    onValueChange={(value) => {
                      setTelegramLogsStatusFilter(value);
                      setTelegramLogsPage(0);
                    }}
                  >
                    <SelectTrigger id="logs-status-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>All statuses</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logs-chat-filter">Chat ID</Label>
                  <Input
                    id="logs-chat-filter"
                    placeholder="e.g. 123456789"
                    value={telegramLogsChatIdFilter}
                    onChange={(event) => {
                      setTelegramLogsChatIdFilter(event.target.value);
                      setTelegramLogsPage(0);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  className="font-heading tracking-wider"
                  onClick={() => {
                    setTelegramLogsSourceFilter(ALL_FILTER_VALUE);
                    setTelegramLogsStatusFilter(ALL_FILTER_VALUE);
                    setTelegramLogsChatIdFilter("");
                    setTelegramLogsPage(0);
                  }}
                  disabled={
                    telegramLogsSourceFilter === ALL_FILTER_VALUE &&
                    telegramLogsStatusFilter === ALL_FILTER_VALUE &&
                    !telegramLogsChatIdFilter
                  }
                >
                  Clear
                </Button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Chat ID</TableHead>
                      <TableHead>HTTP</TableHead>
                      <TableHead>Msg ID</TableHead>
                      <TableHead className="min-w-64">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTelegramLogs ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          <Loader2 className="mx-auto animate-spin text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : telegramLogs.length ? (
                      telegramLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(log.created_at)}</TableCell>
                          <TableCell>
                            {log.status === "success" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                                <CheckCircle2 className="h-3 w-3" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                                <XCircle className="h-3 w-3" />
                                Error
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{log.source}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{log.chat_id ?? "—"}</TableCell>
                          <TableCell className="text-xs">{log.http_status ?? "—"}</TableCell>
                          <TableCell className="text-xs">{log.message_id ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.error ? (
                              <span className="break-all" title={log.error}>{log.error.slice(0, 200)}</span>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          No Telegram delivery attempts logged yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {telegramLogsTotal === 0
                      ? "0 results"
                      : `${telegramLogsPage * telegramLogsPageSize + 1}–${Math.min(
                          (telegramLogsPage + 1) * telegramLogsPageSize,
                          telegramLogsTotal,
                        )} of ${telegramLogsTotal}`}
                  </span>
                  <Select
                    value={String(telegramLogsPageSize)}
                    onValueChange={(value) => {
                      setTelegramLogsPageSize(Number(value));
                      setTelegramLogsPage(0);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTelegramLogsPage((p) => Math.max(0, p - 1))}
                    disabled={telegramLogsPage === 0 || isLoadingTelegramLogs}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {telegramLogsPage + 1} of {Math.max(1, Math.ceil(telegramLogsTotal / telegramLogsPageSize))}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTelegramLogsPage((p) => p + 1)}
                    disabled={
                      isLoadingTelegramLogs ||
                      (telegramLogsPage + 1) * telegramLogsPageSize >= telegramLogsTotal
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-glow-card">
              {isLoadingRequests ? (
                <div className="flex items-center gap-3 p-6 text-muted-foreground">
                  <Loader2 className="animate-spin text-primary" />
                  Loading requests...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length ? (
                      requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(request.created_at)}</TableCell>
                          <TableCell className="min-w-64">{request.address}</TableCell>
                          <TableCell className="whitespace-nowrap">{request.phone}</TableCell>
                          <TableCell>{request.service_type}</TableCell>
                          <TableCell>{request.distance_miles} mi</TableCell>
                          <TableCell className="capitalize">{request.status}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No estimate requests yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            <Dialog open={exportMode !== null} onOpenChange={(open) => !open && closeExportPreview()}>
              <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden p-0">
                <DialogHeader className="border-b border-border px-6 py-5">
                  <DialogTitle>Preview {exportMode === "csv" ? "CSV" : "Excel"} Export</DialogTitle>
                  <DialogDescription>
                    Confirm normalized phone values before downloading the CRM export.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 border-b border-border px-6 py-4 md:grid-cols-[1fr_150px_150px_190px_170px_170px_auto] md:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="preview-phone-filter">Phone</Label>
                    <Input
                      id="preview-phone-filter"
                      value={previewPhoneQuery}
                      onChange={(event) => setPreviewPhoneQuery(event.target.value)}
                      placeholder="Search original or normalized"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preview-date-from">From</Label>
                    <Input
                      id="preview-date-from"
                      type="date"
                      value={previewDateFrom}
                      onChange={(event) => setPreviewDateFrom(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preview-date-to">To</Label>
                    <Input
                      id="preview-date-to"
                      type="date"
                      value={previewDateTo}
                      min={previewDateFrom || undefined}
                      onChange={(event) => setPreviewDateTo(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={previewTimeZoneFilter} onValueChange={setPreviewTimeZoneFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Local timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LOCAL_TIME_ZONE_VALUE}>Local ({userTimeZone})</SelectItem>
                        {SPECIFIC_TIME_ZONES.map((timeZone) => (
                          <SelectItem key={timeZone} value={timeZone}>
                            {timeZone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={previewStatusFilter} onValueChange={setPreviewStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>All statuses</SelectItem>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Service</Label>
                    <Select value={previewServiceFilter} onValueChange={setPreviewServiceFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>All services</SelectItem>
                        {serviceOptions.map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={resetPreviewFilters}>
                    Reset
                  </Button>
                </div>

                <div className="max-h-[56vh] overflow-auto px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Original Phone</TableHead>
                        <TableHead>Normalized Phone</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPreviewRows.length ? (
                        filteredPreviewRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap">{row.created}</TableCell>
                            <TableCell className="min-w-56">{row.address}</TableCell>
                            <TableCell className="whitespace-nowrap">{row.originalPhone || "—"}</TableCell>
                            <TableCell className="whitespace-nowrap font-medium text-primary">
                              {row.normalizedPhone || "—"}
                            </TableCell>
                            <TableCell>{row.service}</TableCell>
                            <TableCell className="capitalize">{row.status}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            No requests match these filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <DialogFooter className="border-t border-border px-6 py-5">
                  <p className="mr-auto text-sm text-muted-foreground">
                    {filteredPreviewRows.length} of {exportPreviewRows.length} shown
                  </p>
                  <Button variant="outline" onClick={closeExportPreview}>
                    Cancel
                  </Button>
                  <Button disabled={!filteredExportRows.length} onClick={confirmExport} className="font-heading tracking-wider">
                    {exportMode === "csv" ? <Download /> : <FileSpreadsheet />}
                    Download {exportMode === "csv" ? "CSV" : "Excel"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </section>
    </main>
  );
};

export default Admin;
