import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import CTAButton from "@/components/CTAButton";
import AddressAutocomplete from "@/components/quote/AddressAutocomplete";
import RoutePreview from "@/components/quote/RoutePreview";
import { useRoutePreview } from "@/hooks/useRoutePreview";
import { maskUSPhoneInput, toE164US } from "@/lib/phone";

const phonePattern = /^\+?[0-9][0-9\s().-]{6,24}[0-9]$/;

const directionValues = ["pickup", "dropoff", "both"] as const;
type Direction = (typeof directionValues)[number];

const serviceOptions = [
  "Furniture & Appliance Delivery",
  "Store / Marketplace Pickup",
  "Small Move / Single Item",
  "Cabinet Delivery & Installation",
  "Assembly & Setup",
  "Materials / Equipment Delivery",
] as const;

const stopSchema = z.string().trim().min(3).max(160);
const emailSchema = z.string().trim().email().max(254);
const nameSchema = z.string().trim().min(1).max(80);

const estimateSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: z.string().trim().regex(phonePattern),
  serviceType: z.enum(serviceOptions),
  distanceMiles: z.number().positive().max(500),
  serviceDirection: z.enum(directionValues),
  stops: z.array(stopSchema).min(2).max(6),
  preferredDate: z.string().optional(),
  preferredTime: z.string().trim().max(40).optional(),
  itemWeightLbs: z.number().min(0).max(100000).optional(),
  itemDimensions: z.string().trim().max(120).optional(),
  itemQuantity: z.number().int().min(1).max(999),
  notes: z.string().trim().max(500).optional(),
});

type QuoteFormProps = {
  idPrefix?: string;
  onSuccess?: () => void;
  compact?: boolean;
};

type SubmitEstimateRequestResult = {
  id: string;
  public_code: string | null;
  tracking_token: string | null;
};

type SubmitEstimateRequestRpc = (
  fn: "submit_estimate_request",
  args: {
    _address: string;
    _phone: string;
    _name: string | null;
    _email: string | null;
    _service_type: string;
    _distance_miles: number;
    _service_direction: Direction;
    _stops: string[];
    _preferred_date: string | null;
    _preferred_time: string | null;
    _item_weight_lbs: number | null;
    _item_dimensions: string | null;
    _item_quantity: number;
    _notes: string | null;
  },
) => Promise<{ data: SubmitEstimateRequestResult[] | null; error: { message: string } | null }>;

const directionOptions: { value: Direction; label: string; hint: string }[] = [
  { value: "pickup", label: "Pickup", hint: "We pick up only" },
  { value: "dropoff", label: "Drop-off", hint: "We deliver only" },
  { value: "both", label: "Pickup & Drop-off", hint: "Full route" },
];

const stopLabels = ["Point A", "Point B", "Point C", "Point D", "Point E", "Point F"];

const QuoteForm = ({ idPrefix = "quote", onSuccess, compact = false }: QuoteFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<Direction>("both");
  const [stops, setStops] = useState<string[]>(["", ""]);
  const [stopErrors, setStopErrors] = useState<boolean[]>([false, false]);
  const [stopVerified, setStopVerified] = useState<boolean[]>([false, false]);
  const [stopCenters, setStopCenters] = useState<Array<[number, number] | null>>([null, null]);
  const [phoneInput, setPhoneInput] = useState("");
  const [distanceInput, setDistanceInput] = useState("");
  const [autoMiles, setAutoMiles] = useState<string | null>(null);

  const updateStop = (
    index: number,
    value: string,
    verified = false,
    center: [number, number] | null = null,
  ) => {
    setStops((prev) => prev.map((stop, i) => (i === index ? value : stop)));
    setStopErrors((prev) => prev.map((err, i) => (i === index ? false : err)));
    setStopVerified((prev) => prev.map((v, i) => (i === index ? verified : v)));
    setStopCenters((prev) => prev.map((c, i) => (i === index ? center : c)));
  };

  const addStop = () => {
    if (stops.length >= 6) return;
    setStops((prev) => [...prev, ""]);
    setStopErrors((prev) => [...prev, false]);
    setStopVerified((prev) => [...prev, false]);
    setStopCenters((prev) => [...prev, null]);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
    setStopErrors((prev) => prev.filter((_, i) => i !== index));
    setStopVerified((prev) => prev.filter((_, i) => i !== index));
    setStopCenters((prev) => prev.filter((_, i) => i !== index));
  };

  const routeCenters = useMemo(() => {
    // Only consider non-empty stops; if user typed but didn't pick, center is null → triggers helper text
    return stops.map((s, i) => (s.trim().length >= 3 ? stopCenters[i] : null));
  }, [stops, stopCenters]);

  // If any required stop has text but no center, treat as missing.
  const anyTextWithoutCenter = stops.some((s, i) => s.trim().length >= 3 && !stopCenters[i]);

  const route = useRoutePreview(routeCenters);

  // Autofill miles when route resolves and user hasn't manually overridden
  const computedMilesStr =
    route.totalMiles != null && !route.overLimit ? route.totalMiles.toFixed(1) : null;

  useEffect(() => {
    if (!computedMilesStr) return;
    // Only overwrite if field is empty or still matches the previous auto value
    if (distanceInput === "" || distanceInput === autoMiles) {
      setAutoMiles(computedMilesStr);
      setDistanceInput(computedMilesStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedMilesStr]);

  const isAuto = autoMiles != null && distanceInput === autoMiles && computedMilesStr === autoMiles;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phoneRaw = String(formData.get("phone") || "").trim();
    const phone = toE164US(phoneRaw) ?? phoneRaw;
    const serviceType = String(formData.get("service") || "");
    const distanceRaw = String(formData.get("distance") || "").trim().replace(",", ".");
    const distanceMiles = Number(distanceRaw);
    const preferredDate = String(formData.get("preferredDate") || "").trim();
    const preferredTime = String(formData.get("preferredTime") || "").trim();
    const itemWeightRaw = String(formData.get("itemWeight") || "").trim();
    const itemDimensions = String(formData.get("itemDimensions") || "").trim();
    const itemQuantity = Number(formData.get("itemQuantity") || 1);
    const notes = String(formData.get("notes") || "").trim();

    // Highlight empty required stops (Point A & B always required)
    const newStopErrors = stops.map((s, i) => i < 2 && s.trim().length < 3);
    if (newStopErrors.some(Boolean)) {
      setStopErrors(newStopErrors);
      toast.error("Add Point A and Point B", {
        description: "Pick addresses from the suggestions to speed up the estimate.",
      });
      return;
    }

    const cleanedStops = stops.map((s) => s.trim()).filter(Boolean);

    const parsed = estimateSchema.safeParse({
      name: name || undefined,
      email: email || undefined,
      phone,
      serviceType,
      distanceMiles,
      serviceDirection: direction,
      stops: cleanedStops,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
      itemWeightLbs: itemWeightRaw ? Number(itemWeightRaw) : undefined,
      itemDimensions: itemDimensions || undefined,
      itemQuantity,
      notes: notes || undefined,
    });

    if (!parsed.success) {
      toast.error("Please check the request details", {
        description: "Phone, service, distance and quantity are required. Email must be valid if provided.",
      });
      return;
    }

    setIsSubmitting(true);

    let inserted: SubmitEstimateRequestResult | null = null;
    let rpcError: { message: string } | null = null;
    try {
      const res = await (supabase.rpc as unknown as SubmitEstimateRequestRpc)(
        "submit_estimate_request",
        {
          _address: parsed.data.stops.join(" → "),
          _phone: parsed.data.phone,
          _name: parsed.data.name || null,
          _email: parsed.data.email || null,
          _service_type: parsed.data.serviceType,
          _distance_miles: parsed.data.distanceMiles,
          _service_direction: parsed.data.serviceDirection,
          _stops: parsed.data.stops,
          _preferred_date: parsed.data.preferredDate || null,
          _preferred_time: parsed.data.preferredTime || null,
          _item_weight_lbs: parsed.data.itemWeightLbs ?? null,
          _item_dimensions: parsed.data.itemDimensions || null,
          _item_quantity: parsed.data.itemQuantity,
          _notes: parsed.data.notes || null,
        },
      );
      rpcError = res.error;
      inserted = res.data?.[0] ?? null;
    } catch (err) {
      // Network failure / unexpected throw — never let it bubble to the Lovable error overlay.
      rpcError = { message: err instanceof Error ? err.message : "Unknown error" };
    }

    setIsSubmitting(false);

    if (rpcError || !inserted) {
      toast.error("Could not send request", {
        description: "Please try again or call us for a quick estimate.",
      });
      return;
    }

    // Telegram + email notifications are dispatched server-side by AFTER INSERT
    // triggers on estimate_requests. Wrap all post-success side effects so a
    // rendering/state error never crashes the app after a confirmed insert.
    try {
      try { form.reset(); } catch { /* form may be detached */ }
      setStops(["", ""]);
      setStopErrors([false, false]);
      setStopVerified([false, false]);
      setStopCenters([null, null]);
      setDistanceInput("");
      setAutoMiles(null);
      setPhoneInput("");
      setDirection("both");

      const code = inserted.public_code;
      if (code) {
        try {
          localStorage.setItem("pickuphaul_last_request_code", code);
        } catch {
          /* storage may be blocked (private mode / iframe) */
        }
        toast.success(`Request received — your tracking code is ${code}`, {
          description: "Save this code. You can check status anytime at /status using your code and the last 4 digits of your phone.",
          duration: 12000,
        });
      } else {
        toast.success("Request sent", {
          description: "We received your details and will contact you with a confirmed estimate.",
        });
      }
      try { onSuccess?.(); } catch { /* parent handler should not break us */ }
    } catch (err) {
      // Last-resort guard — request is already saved server-side.
      console.error("post-submit cleanup error", err);
    }
  };

  const labelClass =
    "text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium";
  const inputClass = "bg-secondary/40 border-white/5 h-12 rounded-xl";
  const selectClass =
    "flex h-12 w-full rounded-xl border border-white/5 bg-secondary/40 px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service direction */}
      <div className="space-y-2">
        <span className={labelClass}>Service direction</span>
        <div className="grid grid-cols-3 gap-2">
          {directionOptions.map((opt) => {
            const active = direction === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDirection(opt.value)}
                className={`group rounded-xl border px-3 py-3 text-left transition-all ${
                  active
                    ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                    : "border-white/5 bg-secondary/40 hover:border-white/15"
                }`}
              >
                <div
                  className={`text-xs font-heading tracking-wider uppercase ${
                    active ? "text-primary" : "text-foreground"
                  }`}
                >
                  {opt.label}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  {opt.hint}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Route stops */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Route — points A, B, C…</span>
          <button
            type="button"
            onClick={addStop}
            disabled={stops.length >= 6}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3 w-3" /> Add stop
          </button>
        </div>
        <div className="space-y-2">
          {stops.map((value, index) => {
            const hasError = stopErrors[index];
            const verified = stopVerified[index];
            return (
              <div key={index} className="flex items-start gap-2">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-[11px] font-heading uppercase tracking-wider transition-colors ${
                    hasError
                      ? "border-destructive/60 bg-destructive/10 text-destructive"
                      : verified
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-white/5 bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <AddressAutocomplete
                  value={value}
                  onChange={(v) => updateStop(index, v, false, null)}
                  onSelect={(s) => updateStop(index, s.label, true, s.center)}
                  required={index < 2}
                  invalid={hasError}
                  placeholder={`${stopLabels[index]} — start typing an address`}
                  ariaLabel={`${stopLabels[index]} address`}
                  inputClassName={inputClass}
                />
                {stops.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeStop(index)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/40 border border-white/5 text-muted-foreground hover:text-foreground hover:border-white/15 transition-colors"
                    aria-label={`Remove ${stopLabels[index]}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {stopErrors.some(Boolean) && (
          <p className="text-[11px] text-destructive">
            Pick an address from the suggestions for every required point.
          </p>
        )}
        {anyTextWithoutCenter && !route.loading && (
          <p className="text-[11px] text-muted-foreground">
            Pick from suggestions to compute miles.
          </p>
        )}
        <RoutePreview state={route} stopCount={stops.filter((s) => s.trim().length >= 3).length} />
      </div>

      {/* Name & Email — optional but recommended for confirmations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`} className={labelClass}>
            Your name (optional)
          </Label>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            maxLength={80}
            placeholder="Alex Rivera"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-email`} className={labelClass}>
            Email (for confirmation)
          </Label>
          <Input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            maxLength={254}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "grid md:grid-cols-3 gap-4"}>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-service`} className={labelClass}>
            Service
          </Label>
          <select
            id={`${idPrefix}-service`}
            name="service"
            required
            defaultValue=""
            className={selectClass}
          >
            <option value="" disabled>
              Select
            </option>
            {serviceOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${idPrefix}-distance`} className={labelClass}>
              Total miles
            </Label>
            {isAuto && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-heading uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-2.5 w-2.5" /> Auto
              </span>
            )}
          </div>
          <Input
            id={`${idPrefix}-distance`}
            name="distance"
            type="text"
            required
            inputMode="decimal"
            pattern="^\d{1,3}([.,]\d{1,2})?$"
            placeholder="12"
            value={distanceInput}
            onChange={(e) => {
              // Allow only digits and a single comma/dot
              const cleaned = e.target.value.replace(/[^\d.,]/g, "");
              setDistanceInput(cleaned);
            }}
            onBlur={(e) => setDistanceInput(e.target.value.replace(",", "."))}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-phone`} className={labelClass}>
            Phone
          </Label>
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={16}
            value={phoneInput}
            onChange={(e) => setPhoneInput(maskUSPhoneInput(e.target.value))}
            pattern="^\(\d{3}\) \d{3}-\d{4}$"
            placeholder="(555) 123-4567"
            className={inputClass}
          />
        </div>
      </div>

      {/* Date & time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-date`} className={labelClass}>
            Preferred date
          </Label>
          <Input
            id={`${idPrefix}-date`}
            name="preferredDate"
            type="date"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-time`} className={labelClass}>
            Preferred time
          </Label>
          <Input
            id={`${idPrefix}-time`}
            name="preferredTime"
            type="text"
            maxLength={40}
            placeholder="e.g. 9–11 AM, ASAP, evening"
            className={inputClass}
          />
        </div>
      </div>

      {/* Item details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-quantity`} className={labelClass}>
            Quantity
          </Label>
          <Input
            id={`${idPrefix}-quantity`}
            name="itemQuantity"
            type="number"
            required
            min="1"
            max="999"
            defaultValue="1"
            inputMode="numeric"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-weight`} className={labelClass}>
            Weight (lbs)
          </Label>
          <Input
            id={`${idPrefix}-weight`}
            name="itemWeight"
            type="number"
            min="0"
            max="100000"
            step="1"
            inputMode="numeric"
            placeholder="e.g. 250"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-dimensions`} className={labelClass}>
            Dimensions (in)
          </Label>
          <Input
            id={`${idPrefix}-dimensions`}
            name="itemDimensions"
            type="text"
            maxLength={120}
            placeholder="L × W × H, e.g. 60×30×40"
            className={inputClass}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`} className={labelClass}>
          Notes (optional)
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          name="notes"
          maxLength={500}
          rows={3}
          placeholder="Stairs, fragile items, access notes…"
          className="bg-secondary/40 border-white/5 resize-none rounded-xl"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <CTAButton
          as="button"
          type="submit"
          disabled={isSubmitting}
          variant="primary"
          size="md"
          icon={isSubmitting ? "none" : "arrow"}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </span>
          ) : (
            "Send Request"
          )}
        </CTAButton>
        <p className="text-[11px] text-muted-foreground font-light">
          No payment online. We review the details first and contact you with a confirmed estimate.
        </p>
      </div>
    </form>
  );
};

export default QuoteForm;
