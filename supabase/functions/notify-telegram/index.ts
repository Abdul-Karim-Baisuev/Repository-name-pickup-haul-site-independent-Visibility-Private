import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const ADMIN_BASE_URL = "https://www.autobais.app/admin";

const escapeHtml = (input: unknown): string =>
  String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatStops = (stops: unknown): string => {
  if (!Array.isArray(stops) || stops.length === 0) return "";
  return stops
    .map((s, i) => `  ${String.fromCharCode(65 + i)}. ${escapeHtml(s)}`)
    .join("\n");
};

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const buildEstimateMessage = (
  row: Record<string, unknown>,
) => {
  const lines: string[] = [];
  lines.push(
    "🚚 <b>PICKUP HAUL — New estimate request</b>",
  );
  lines.push("");
  lines.push(`<b>Service:</b> ${escapeHtml(row.service_type)} (${escapeHtml(row.service_direction)})`);
  if (row.name) lines.push(`<b>Name:</b> ${escapeHtml(row.name)}`);
  if (row.email) lines.push(`<b>Email:</b> ${escapeHtml(row.email)}`);
  lines.push(`<b>Phone:</b> ${escapeHtml(row.phone)}`);
  lines.push(`<b>Distance:</b> ${escapeHtml(row.distance_miles)} mi`);
  lines.push(`<b>Quantity:</b> ${escapeHtml(row.item_quantity)}`);
  if (row.item_weight_lbs) lines.push(`<b>Weight:</b> ${escapeHtml(row.item_weight_lbs)} lbs`);
  if (row.item_dimensions) lines.push(`<b>Dimensions:</b> ${escapeHtml(row.item_dimensions)}`);
  if (row.preferred_date) lines.push(`<b>Preferred date:</b> ${escapeHtml(row.preferred_date)}`);
  if (row.preferred_time) lines.push(`<b>Preferred time:</b> ${escapeHtml(row.preferred_time)}`);

  const stopsBlock = formatStops(row.stops);
  if (stopsBlock) {
    lines.push("");
    lines.push("<b>Route:</b>");
    lines.push(stopsBlock);
  } else if (row.address) {
    lines.push(`<b>Address:</b> ${escapeHtml(row.address)}`);
  }

  if (row.notes) {
    lines.push("");
    lines.push(`<b>Notes:</b> ${escapeHtml(row.notes)}`);
  }
  lines.push("");
  lines.push(
    `🔗 <a href="${ADMIN_BASE_URL}?tab=estimates&request_id=${escapeHtml(row.id)}">Open in admin panel</a>`,
  );
  lines.push(`<i>ID: ${escapeHtml(row.id)} · ${escapeHtml(row.created_at)}</i>`);
  return lines.join("\n");
};

const buildBookingMessage = (row: Record<string, unknown>) => {
  const lines: string[] = [];
  lines.push("📅 <b>PICKUP HAUL — New booking request</b>");
  lines.push("");
  lines.push(`<b>Service:</b> ${escapeHtml(row.service_type)}`);
  lines.push(`<b>Name:</b> ${escapeHtml(row.name)}`);
  lines.push(`<b>Email:</b> ${escapeHtml(row.email)}`);
  lines.push(`<b>Phone:</b> ${escapeHtml(row.phone)}`);
  if (row.address) lines.push(`<b>Address:</b> ${escapeHtml(row.address)}`);
  if (row.preferred_date) lines.push(`<b>Preferred date:</b> ${escapeHtml(row.preferred_date)}`);
  if (row.preferred_time) lines.push(`<b>Preferred time:</b> ${escapeHtml(row.preferred_time)}`);
  if (row.description) {
    lines.push("");
    lines.push(`<b>Details:</b> ${escapeHtml(row.description)}`);
  }
  lines.push("");
  lines.push(
    `🔗 <a href="${ADMIN_BASE_URL}?tab=bookings&request_id=${escapeHtml(row.id)}">Open in admin panel</a>`,
  );
  lines.push(`<i>ID: ${escapeHtml(row.id)} · ${escapeHtml(row.created_at)}</i>`);
  return lines.join("\n");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured (connect Telegram in Connectors)");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env not configured");

    // ---- Authentication ----
    // Allow callers that are EITHER:
    //   (a) authenticated admins (admin UI test button), OR
    //   (b) the service role (DB triggers using service-role JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const claims = parseJwtClaims(token);
    const role = claims?.role as string | undefined;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let isAuthorized = false;
    // Accept legacy service-role JWT OR new short-format service-role key
    // (sb_secret_*) by exact constant-time match against env var.
    if (token && token === SUPABASE_SERVICE_ROLE_KEY) {
      isAuthorized = true;
    } else if (role === "service_role") {
      isAuthorized = true;
    } else if (claims?.sub) {
      // Verify the JWT and check admin role
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser(token);
      if (userData?.user?.id) {
        const { data: hasRole } = await admin.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (hasRole === true) isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ---- End authentication ----

    let body: {
      estimate_request_id?: string;
      booking_request_id?: string;
      is_test?: boolean;
    } = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const estimateId = body.estimate_request_id;
    const bookingId = body.booking_request_id;

    if (!estimateId && !bookingId) {
      return new Response(
        JSON.stringify({ error: "estimate_request_id or booking_request_id (uuid) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const id = (estimateId ?? bookingId)!;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return new Response(JSON.stringify({ error: "Invalid uuid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the saved chat_id
    const { data: setting, error: settingErr } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "telegram_chat_id")
      .maybeSingle();

    if (settingErr) throw new Error(`Could not read telegram_chat_id: ${settingErr.message}`);
    const chatIdRaw = setting?.value?.trim();
    if (!chatIdRaw) {
      return new Response(
        JSON.stringify({ error: "telegram_chat_id is not configured. Set it in Admin → Telegram Notifications." }),
        { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const chatId: string | number = /^-?\d+$/.test(chatIdRaw) ? Number(chatIdRaw) : chatIdRaw;

    let text: string;
    let logSource: string;
    let logEstimateId: string | null = null;

    if (bookingId) {
      const { data: row, error: rowErr } = await admin
        .from("booking_requests")
        .select(
          "id, created_at, name, email, phone, service_type, description, address, preferred_date, preferred_time, status",
        )
        .eq("id", bookingId)
        .maybeSingle();

      if (rowErr) throw new Error(`Could not load booking request: ${rowErr.message}`);
      if (!row) {
        return new Response(JSON.stringify({ error: "Booking request not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      text = buildBookingMessage(row as Record<string, unknown>);
      logSource = "notify-telegram:booking";
    } else {
      const { data: row, error: rowErr } = await admin
        .from("estimate_requests")
        .select(
          "id, created_at, name, email, address, phone, service_type, service_direction, distance_miles, stops, preferred_date, preferred_time, item_weight_lbs, item_dimensions, item_quantity, notes, status",
        )
        .eq("id", estimateId!)
        .maybeSingle();

      if (rowErr) throw new Error(`Could not load estimate request: ${rowErr.message}`);
      if (!row) {
        return new Response(JSON.stringify({ error: "Estimate request not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      text = buildEstimateMessage(row as Record<string, unknown>);
      logSource = "notify-telegram";
      logEstimateId = estimateId!;
    }

    const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const tgData = await tgRes.json();

    if (!tgRes.ok) {
      const errText = `Telegram error [${tgRes.status}]: ${JSON.stringify(tgData)}`;
      await admin.from("telegram_send_logs").insert({
        source: logSource,
        chat_id: String(chatId),
        estimate_request_id: logEstimateId,
        status: "error",
        error: errText,
        http_status: tgRes.status,
      });
      return new Response(
        JSON.stringify({ error: "Failed to send Telegram message" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messageId = tgData.result?.message_id ?? null;
    await admin.from("telegram_send_logs").insert({
      source: logSource,
      chat_id: String(chatId),
      estimate_request_id: logEstimateId,
      status: "success",
      message_id: messageId,
      http_status: tgRes.status,
    });

    return new Response(
      JSON.stringify({ ok: true, message_id: messageId, chat_id: chatId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("notify-telegram error:", message);
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await admin.from("telegram_send_logs").insert({
          source: "notify-telegram",
          status: "error",
          error: message,
        });
      }
    } catch (_) { /* best-effort */ }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
