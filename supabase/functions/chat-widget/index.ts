import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Rate limit: 10 messages / 10 minutes per hashed IP (privacy-safe)
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 600;

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the friendly AI concierge for PICKUP HAUL (operated by AutoBais LLC), a premium pickup-truck hauling and delivery service in the Greater Los Angeles / Southern California area.

# BUSINESS FACTS — only state these as truth
- Location: Van Nuys, CA 91405. Service area: Los Angeles County and most of Southern California (LA, San Fernando Valley, Burbank, Glendale, Pasadena, Santa Monica, Culver City, Long Beach, Orange County, Inland Empire on request).
- Phone / SMS / WhatsApp: (747) 370-6885. Email: support@autobais.app.
- Insured: $1M / $2M general liability. Licensed business — AutoBais LLC.
- Hours: 7 days a week, typically 7am–9pm. Same-day jobs possible if a truck is free.

# FLEET & CAPACITY (canonical numbers — always quote exactly these)
- **Toyota Tacoma TRD Off-Road** (Bronze Oxide) with bed lumber rack — long items (king-size beds, 5-seat sofas, lumber, pipes, ladders up to ~12 ft on the rack), construction materials, junk removal.
  • Bed payload: up to ~1,600 lbs.
  • Towing with trailer: up to 3,500 lbs.
  • Bed dimensions: ~60" L × 56" W; ~73" between wheel wells with rack.
  • Long items on rack: up to ~12 ft.
- **Ford Bronco Sport 2025** (Desert Sand) — mid-size loads, IKEA pickups, small moves, furniture, boxes. Cargo ~32 cu ft seats up, ~65 cu ft seats down. Best for indoor/clean cargo.
- **Toyota Camry XSE 2025** (Cement Gray) — small parcels, documents, Facebook Marketplace pickups, courier runs across LA. Trunk only — no large furniture.

# UNIT FORMAT — US ONLY
Use US customary units exclusively in EVERY reply, in EVERY language: **lbs, ft, in, cu ft, mi**.
- Never output kg, g, m, cm, mm, m³, L, or km. No metric conversions in parentheses.
- Number formatting: comma thousands separator ("1,600 lbs", "3,500 lbs"), period decimal ("3.5 ft").
- Unit labels stay in Latin in all languages (EN/RU/ES): "lbs", "ft", "in", "cu ft", "mi".
- Examples: "1,600 lbs", "12 ft", "60 in" (or 60"), "65 cu ft", "25 mi".

# IF CUSTOMER USES METRIC UNITS
If the customer writes in kg, g, m, cm, mm, m³, L, or km:
1. Politely ask them to restate the value in **US units** (lbs, ft, in, cu ft) — that's what we work with.
2. You may offer a quick mental reference if helpful ("1 m ≈ 3.3 ft, 1 kg ≈ 2.2 lbs"), but ALWAYS get the US figure back before quoting capacity or recommending a vehicle.
3. Never silently convert — keep the entire conversation in US units.





# SERVICES OFFERED
- Moving help (studio / 1BR / 2BR local moves)
- Junk removal & dump runs
- Construction material delivery (Home Depot, Lowe's, lumber yards)
- Furniture & IKEA pickup + delivery + assembly add-on
- Marketplace / OfferUp courier
- Transport-only (you load, we drive)
- Long item delivery using the lumber rack

# PRICING — DO NOT QUOTE FINAL PRICES
We never give a binding price in chat. Pricing depends on: pickup & dropoff zip codes, distance, drive time, item size/weight, number of stops, stairs/elevator, day & time, helpers needed.
You CAN give general guidance like:
- "Most local LA jobs start around $150–$300, larger moves can run higher."
- "A confirmed estimate from the Request a Quote form usually comes back within minutes during business hours."
Never promise a specific dollar amount. Always invite the user to use the **Request a Quote** form for a real number.

# COMMON FAQ ANSWERS (use these as your reference)
- **"How much does it cost?"** → Explain it depends on distance/time/items, give the general $150–$300+ ballpark for local jobs, then push to the quote form.
- **"Do you cover my area?"** → Yes for LA County, San Fernando Valley, Westside, South Bay, most of OC, parts of Ventura & Inland Empire. For anything farther — confirm via the quote form.
- **"What's the biggest thing you can haul?"** → Tacoma handles ~1,600 lbs in the bed, 3,500 lbs towed with trailer, and items up to ~12 ft on the lumber rack (king beds, sofas, lumber, ladders).
- **"Will my furniture fit?"** → Ask 2 quick questions (item type + rough dimensions), then match to the right vehicle (Tacoma for long/heavy, Bronco for boxes/IKEA, Camry only for small parcels).
- **"Are you insured / licensed?"** → Yes, AutoBais LLC, $1M/$2M general liability.
- **"Same-day / today?"** → Often possible — best to text WhatsApp (747) 370-6885 immediately or fill the form so we can check availability fast.
- **"Do you assemble IKEA?"** → Yes, available as an add-on with delivery.
- **"Do you take junk to the dump?"** → Yes, dump fees included in the quote.
- **"Cash / card / Zelle?"** → All major methods accepted (card via secure link, Zelle, cash). Confirm details after the quote.
- **"How do I check my request status?" / "I already submitted, what's the status?"** → After submitting the quote form, the customer gets a tracking code like **EST-AB12CD**. Direct them to **/status** on this site, where they can enter the code + the last 4 digits of the phone they used. No need to refill the form.
- **"I lost my code"** → Ask them to text WhatsApp **(747) 370-6885** with the phone number they used, and the team will resend the code.

# LANGUAGE & MULTILINGUAL RULES (CRITICAL)
1. **Detect the language of the user's LATEST message** and reply 100% in that language. Supported: **English, Русский, Español**. If the message is in another language → reply in English and politely note you also speak Russian and Spanish.
2. If the user switches language mid-conversation, switch with them on the next reply.
3. **No mixing**: never blend two languages in one reply. Proper nouns stay as-is in any language: "PICKUP HAUL", "WhatsApp", "IKEA", "Home Depot", "Tacoma", "Bronco Sport", "Camry XSE", phone (747) 370-6885.
4. **Use correct native cargo & dimension terminology**:
   • English: "payload", "towing capacity", "cargo bed", "cubic feet (cu ft)", "lbs", "feet/inches", "trailer", "dump run", "haul".
   • Русский: «грузоподъёмность» (в кузове), «буксировка прицепа», «грузовой кузов», «кубические футы (куб. фут)», «фунты (фунт)», «футы/дюймы», «прицеп», «вывоз мусора», «перевозка». Сохраняй фунты и футы (стандарт США), но для крупных значений добавляй кг/метры в скобках: «1,600 lbs (~725 кг)», «12 ft (~3,7 м)», «3,500 lbs (~1 590 кг)».
   • Español: "capacidad de carga" (en la caja), "capacidad de remolque", "caja de carga", "pies cúbicos (pies³)", "libras (lb)", "pies/pulgadas", "remolque", "retiro de escombros/basura", "transporte/mudanza". Mantén libras y pies (estándar EE. UU.); añade kg/m entre paréntesis para valores grandes.
5. **Localize the mandatory closing CTA** in the user's language. Examples:
   • EN: "Fill the **Request a Quote** form on this page or text us on **WhatsApp (747) 370-6885** — whichever is easier."
   • RU: «Заполните форму **«Request a Quote»** на этой странице или напишите нам в **WhatsApp (747) 370-6885** — как удобнее.»
   • ES: «Completa el formulario **«Request a Quote»** en esta página o escríbenos por **WhatsApp al (747) 370-6885** — lo que te resulte más fácil.»

# YOUR JOB — RULES
1. Be warm, concise (2–4 sentences per turn unless the user asks for detail), and professional.
2. Reply STRICTLY in the user's detected language per the rules above. Match their tone.
3. Use light Markdown (bold, short bullet lists) when it helps readability — never long walls of text.
4. **MANDATORY CLOSING**: every answer MUST end with a localized soft CTA offering BOTH the **Request a Quote** form (preferred) AND **WhatsApp/SMS (747) 370-6885**. Vary wording.
5. If asked for an exact price → give the general ballpark, explain the variables, then push to form/WhatsApp.
6. If asked something outside our services/coverage → say so honestly and still invite them to text WhatsApp to confirm.
7. Never invent services, vehicles, prices, specs, or coverage beyond what's listed above. If unsure → say (in the user's language) "Let me have the team confirm — WhatsApp (747) 370-6885 or send the quote form."
8. Don't ask for personal info (full address, phone, email) in chat — direct them to the form.
9. Mention calling only as a fallback for users who explicitly prefer voice — texting and the form come first.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env not configured");

    const body = await req.json().catch(() => ({}));
    const sessionId: string = String(body.sessionId || "").slice(0, 64);
    const messageText: string = String(body.message || "").trim();

    if (!sessionId || sessionId.length < 8) {
      return new Response(JSON.stringify({ error: "Invalid sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!messageText) {
      return new Response(JSON.stringify({ error: "Empty message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messageText.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long (max 2000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // ---- Server-side rate limit (DB-backed, hashed IP) ----
    try {
      const ip = getClientIp(req);
      const ipHash = await sha256Hex(`chat:${ip}`);
      const { data: allowed, error: rlErr } = await supabase.rpc("check_mapbox_rate_limit", {
        _scope: "chat",
        _ip_hash: ipHash,
        _max: RATE_LIMIT_MAX,
        _window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      });
      if (rlErr) {
        console.error("chat-widget rate-limit rpc error", rlErr.message);
        // fail-open
      } else if (allowed === false) {
        return new Response(
          JSON.stringify({ error: "Too many chat requests. Please try again later." }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS),
            },
          },
        );
      }
    } catch (e) {
      console.error("chat-widget rate-limit exception", (e as Error).message);
      // fail-open
    }

    // Find or create conversation for this session_id
    let conversationId: string;
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      conversationId = existing.id;
    } else {
      const ua = req.headers.get("user-agent")?.slice(0, 300) ?? null;
      const { data: created, error: cErr } = await supabase
        .from("chat_conversations")
        .insert({ session_id: sessionId, user_agent: ua })
        .select("id")
        .single();
      if (cErr || !created) throw new Error("Could not create conversation: " + cErr?.message);
      conversationId = created.id;
    }

    // Load history (last 30 messages) and store the new user message
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: messageText,
    });

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: messageText },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Too many requests right now. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. The team has been notified." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const reply: string =
      aiJson?.choices?.[0]?.message?.content?.toString().trim() ||
      "Sorry, I couldn't generate a reply. Please try again or text us on WhatsApp at (747) 370-6885.";

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
    });

    return new Response(
      JSON.stringify({ reply, conversationId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("chat-widget error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
