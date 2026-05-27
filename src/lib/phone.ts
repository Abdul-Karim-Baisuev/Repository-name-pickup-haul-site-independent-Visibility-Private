// Phone normalization helpers for US numbers.
// Display format: "(747) 370-6885"
// E.164 format:   "+17473706885"
// tel: links should always use E.164 for cross-device reliability.

/** Strip everything except digits. */
export const digitsOnly = (input: string): string => (input || "").replace(/\D+/g, "");

/**
 * Convert any US-ish phone string to E.164 (+1XXXXXXXXXX).
 * Returns null if it cannot be confidently normalized to a 10-digit US number.
 */
export const toE164US = (input: string | null | undefined): string | null => {
  if (!input) return null;
  let d = digitsOnly(input);
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return null;
  return `+1${d}`;
};

/** Format any input into "(XXX) XXX-XXXX". Falls back to original if not 10 US digits. */
export const formatUSPhone = (input: string | null | undefined): string => {
  if (!input) return "";
  let d = digitsOnly(input);
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return input.toString();
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

/** Live input mask: progressively format as the user types. */
export const maskUSPhoneInput = (input: string): string => {
  const d = digitsOnly(input).slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

/** Build a `tel:` href in E.164. Falls back to digits if normalization fails. */
export const telHref = (input: string | null | undefined): string => {
  const e164 = toE164US(input);
  if (e164) return `tel:${e164}`;
  const d = digitsOnly(input ?? "");
  return d ? `tel:${d}` : "tel:";
};

/** Last 4 digits — used for token-based tracking confirmation. */
export const lastFourDigits = (input: string | null | undefined): string => {
  const d = digitsOnly(input ?? "");
  return d.slice(-4);
};

/** Canonical PICKUP HAUL business phone. */
export const BUSINESS_PHONE_E164 = "+17473706885";
export const BUSINESS_PHONE_DISPLAY = "(747) 370-6885";
export const BUSINESS_PHONE_TEL = `tel:${BUSINESS_PHONE_E164}`;
