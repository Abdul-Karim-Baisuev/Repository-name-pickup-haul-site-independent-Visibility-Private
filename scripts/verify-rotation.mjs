#!/usr/bin/env node
/**
 * Post-rotation verification helper.
 *
 * Runs a quick set of read-only checks that confirm the rotated credentials
 * actually work end-to-end:
 *
 *   1. SUPABASE_SERVICE_ROLE_KEY  → call edge function `notify-telegram` with
 *                                   service-role JWT and a non-existent UUID.
 *                                   Expect HTTP 404 (auth passed, row missing).
 *                                   Anything 401/403 means the key is wrong.
 *
 *   2. service_role_jwt vault     → SELECT length() of the decrypted secret
 *                                   via `supabase db execute`. Confirms the
 *                                   trigger will be able to read it.
 *
 *   3. TELEGRAM_API_KEY           → invoke `telegram-send-test` (must be done
 *                                   with an admin JWT — see notes). Skipped
 *                                   automatically if no ADMIN_JWT is provided.
 *
 *   4. LOVABLE_API_KEY            → ping `telegram-get-updates` (admin-only,
 *                                   uses LOVABLE_API_KEY for the gateway).
 *                                   Skipped without ADMIN_JWT.
 *
 * Usage:
 *   node scripts/verify-rotation.mjs                # run all available checks
 *   node scripts/verify-rotation.mjs supabase       # subset
 *   ADMIN_JWT=eyJ... node scripts/verify-rotation.mjs telegram lovable
 *
 * Environment:
 *   SUPABASE_PROJECT_REF        defaults to ijalhgtxtenktmjipyxw
 *   SUPABASE_SERVICE_ROLE_KEY   read from .env if missing
 *   ADMIN_JWT                   optional; required for telegram + lovable checks
 */

import { readFile, access, constants } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ALL = ["supabase", "vault", "telegram", "lovable"];
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const selected = args.length === 0 ? ALL : args;

for (const t of selected) {
  if (!ALL.includes(t)) {
    console.error(`✖ Unknown check: ${t}. Allowed: ${ALL.join(", ")}`);
    process.exit(1);
  }
}

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ?? "ijalhgtxtenktmjipyxw";
const FUNCTIONS_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1`;

async function loadEnv() {
  const path = resolve(process.cwd(), ".env");
  try {
    await access(path, constants.F_OK);
  } catch {
    return {};
  }
  const raw = await readFile(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✖"} ${name} — ${detail}`);
};

async function checkSupabaseServiceRole(serviceKey) {
  if (!serviceKey) {
    record("SUPABASE_SERVICE_ROLE_KEY", false, "missing in env / .env");
    return;
  }
  const res = await fetch(`${FUNCTIONS_BASE}/notify-telegram`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      booking_request_id: "00000000-0000-0000-0000-000000000000",
    }),
  });
  await res.text();
  // 404 = auth passed but row missing (the expected happy path here).
  // 412 = telegram_chat_id not configured — also means auth passed.
  if (res.status === 404 || res.status === 412) {
    record(
      "notify-telegram (service role)",
      true,
      `HTTP ${res.status} → auth accepted by edge function`,
    );
  } else if (res.status === 401 || res.status === 403) {
    record(
      "notify-telegram (service role)",
      false,
      `HTTP ${res.status} → service-role JWT rejected. Re-check rotation.`,
    );
  } else {
    record(
      "notify-telegram (service role)",
      false,
      `Unexpected HTTP ${res.status} — inspect edge logs.`,
    );
  }
}

function checkVault() {
  const r = spawnSync(
    "supabase",
    [
      "db",
      "execute",
      "--project-ref",
      PROJECT_REF,
      "--sql",
      "SELECT length(decrypted_secret) AS jwt_len FROM vault.decrypted_secrets WHERE name = 'service_role_jwt';",
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    record(
      "vault.service_role_jwt",
      false,
      `supabase CLI failed: ${r.stderr?.trim() || r.stdout?.trim()}`,
    );
    return;
  }
  const out = (r.stdout ?? "").trim();
  // Heuristic: a valid Supabase JWT is > 200 chars.
  const m = out.match(/(\d{2,5})/);
  const len = m ? Number(m[1]) : 0;
  if (len > 200) {
    record(
      "vault.service_role_jwt",
      true,
      `present (${len} chars) — trigger can read it`,
    );
  } else {
    record(
      "vault.service_role_jwt",
      false,
      `not found or too short (len=${len}). Re-run npm run secrets:rotate supabase.`,
    );
  }
}

async function checkTelegram(adminJwt) {
  if (!adminJwt) {
    record(
      "telegram-send-test",
      false,
      "skipped — set ADMIN_JWT=<admin user JWT> to enable",
    );
    return;
  }
  const res = await fetch(`${FUNCTIONS_BASE}/telegram-send-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminJwt}`,
      apikey: adminJwt,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data?.ok) {
    record(
      "telegram-send-test",
      true,
      `sent message_id=${data.message_id ?? "?"}`,
    );
  } else {
    record(
      "telegram-send-test",
      false,
      `HTTP ${res.status} ${JSON.stringify(data).slice(0, 160)}`,
    );
  }
}

async function checkLovable(adminJwt) {
  if (!adminJwt) {
    record(
      "telegram-get-updates (LOVABLE_API_KEY)",
      false,
      "skipped — set ADMIN_JWT=<admin user JWT> to enable",
    );
    return;
  }
  const res = await fetch(`${FUNCTIONS_BASE}/telegram-get-updates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminJwt}`,
      apikey: adminJwt,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    record(
      "telegram-get-updates (LOVABLE_API_KEY)",
      true,
      `gateway reachable, raw_count=${data.raw_count ?? 0}`,
    );
  } else {
    record(
      "telegram-get-updates (LOVABLE_API_KEY)",
      false,
      `HTTP ${res.status} ${JSON.stringify(data).slice(0, 160)}`,
    );
  }
}

const env = await loadEnv();
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const adminJwt = process.env.ADMIN_JWT;

console.log(`Project ref: ${PROJECT_REF}`);
console.log(`Checks:      ${selected.join(", ")}`);
console.log("");

if (selected.includes("supabase")) await checkSupabaseServiceRole(serviceKey);
if (selected.includes("vault")) checkVault();
if (selected.includes("telegram")) await checkTelegram(adminJwt);
if (selected.includes("lovable")) await checkLovable(adminJwt);

const failed = results.filter((r) => !r.ok);
console.log("");
console.log(
  `Summary: ${results.length - failed.length}/${results.length} passed`,
);
process.exit(failed.length === 0 ? 0 : 1);
