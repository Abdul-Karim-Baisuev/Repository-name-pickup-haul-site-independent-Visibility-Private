#!/usr/bin/env node
/**
 * Interactive secret rotation assistant.
 *
 * Rotates the three credentials that are most at risk of leaking from
 * this repository and keeps the local `.env` + Supabase Vault in sync:
 *
 *   1. Supabase service-role JWT (`SUPABASE_SERVICE_ROLE_KEY` + `service_role_jwt` vault entry)
 *   2. Telegram bot token        (`TELEGRAM_API_KEY` connector secret)
 *   3. Lovable API key           (`LOVABLE_API_KEY` managed secret)
 *
 * Why interactive (and not fully automated in CI)?
 * ------------------------------------------------
 * - Lovable + Telegram + Supabase Management API tokens are themselves
 *   highly-privileged and CANNOT live in CI without becoming a new leak
 *   vector. Rotating them must be performed by an operator on a trusted
 *   machine.
 * - The script automates everything that CAN be automated: writing the
 *   new value to `.env`, updating Supabase Vault via `supabase` CLI,
 *   and reminding the operator of the manual steps that remain.
 *
 * Usage:
 *   node scripts/rotate-secrets.mjs                # rotate all
 *   node scripts/rotate-secrets.mjs supabase       # rotate one target
 *   node scripts/rotate-secrets.mjs telegram lovable
 *
 * Requirements:
 *   - `supabase` CLI installed and `supabase login` already done
 *   - SUPABASE_PROJECT_REF env var (or pass --project-ref=<ref>)
 */

import { readFile, writeFile, access, constants } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");
const ALL_TARGETS = ["supabase", "telegram", "lovable"];

const args = process.argv.slice(2);
const projectRefArg = args.find((a) => a.startsWith("--project-ref="));
const projectRef =
  projectRefArg?.split("=")[1] ??
  process.env.SUPABASE_PROJECT_REF ??
  "ijalhgtxtenktmjipyxw";

const targets = args.filter((a) => !a.startsWith("--"));
const selected = targets.length === 0 ? ALL_TARGETS : targets;

for (const t of selected) {
  if (!ALL_TARGETS.includes(t)) {
    console.error(`✖ Unknown target: ${t}. Allowed: ${ALL_TARGETS.join(", ")}`);
    process.exit(1);
  }
}

const rl = createInterface({ input, output });
const ask = (q) => rl.question(q);
const askSecret = async (q) => {
  // Node has no built-in secret input — at minimum echo a warning.
  process.stdout.write(`${q} (input will be visible — paste from clipboard, then clear): `);
  return await new Promise((res) => {
    let buf = "";
    input.once("data", (d) => res(d.toString().trim()));
  });
};

async function readEnv() {
  try {
    await access(ENV_PATH, constants.F_OK);
  } catch {
    return new Map();
  }
  const raw = await readFile(ENV_PATH, "utf8");
  const map = new Map();
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

async function writeEnv(map) {
  const lines = [...map.entries()].map(([k, v]) => `${k}=${v}`);
  await writeFile(ENV_PATH, lines.join("\n") + "\n", "utf8");
}

async function setEnvVar(key, value) {
  const env = await readEnv();
  env.set(key, value);
  await writeEnv(env);
  console.log(`  ✓ Wrote ${key} to .env`);
}

function runSupabase(args) {
  const r = spawnSync("supabase", args, { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`✖ supabase CLI exited with ${r.status}`);
    return false;
  }
  return true;
}

async function rotateSupabase() {
  console.log("\n━━━ 1/3  Supabase service-role key ━━━");
  console.log("Manual step (cannot be automated — Management API token would itself leak):");
  console.log(`  → Open: https://supabase.com/dashboard/project/${projectRef}/settings/api-keys`);
  console.log("  → Click 'Reveal' on service_role, then 'Generate new key'.");
  await ask("Press Enter once a fresh service_role JWT is in your clipboard… ");

  const jwt = await askSecret("Paste the new service_role JWT");
  if (!jwt.startsWith("eyJ")) {
    console.error("✖ Doesn't look like a JWT — aborting Supabase rotation.");
    return;
  }

  await setEnvVar("SUPABASE_SERVICE_ROLE_KEY", jwt);

  console.log("Updating Supabase Vault entry `service_role_jwt`…");
  const sql = `SELECT CASE
    WHEN EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_jwt')
    THEN vault.update_secret(
      (SELECT id FROM vault.secrets WHERE name = 'service_role_jwt'),
      $$${jwt.replace(/\$/g, "$$")}$$,
      'service_role_jwt'
    )::text
    ELSE vault.create_secret($$${jwt.replace(/\$/g, "$$")}$$, 'service_role_jwt', 'Service role JWT for trigger callbacks')::text
  END;`;

  const ok = runSupabase([
    "db",
    "execute",
    "--project-ref",
    projectRef,
    "--sql",
    sql,
  ]);
  if (!ok) {
    console.warn("⚠ Vault update failed — apply the SQL above manually in the SQL editor.");
  }
  console.log("✓ Supabase rotation complete.");
}

async function rotateTelegram() {
  console.log("\n━━━ 2/3  Telegram bot token ━━━");
  console.log("Manual step (Telegram has no rotation API):");
  console.log("  → Open Telegram, message @BotFather:");
  console.log("    /revoke  →  pick the bot  →  copy the new token");
  await ask("Press Enter once the new Telegram token is in your clipboard… ");

  const token = await askSecret("Paste the new Telegram bot token");
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) {
    console.error("✖ Token format looks wrong — aborting Telegram rotation.");
    return;
  }

  await setEnvVar("TELEGRAM_API_KEY", token);
  console.log("Updating connector secret in Lovable Cloud…");
  console.log("  → TELEGRAM_API_KEY is connector-managed. Open the Lovable project →");
  console.log("    Connectors → Telegram → paste the new token to sync the runtime secret.");
  console.log("✓ Telegram rotation complete (after you sync the connector).");
}

async function rotateLovable() {
  console.log("\n━━━ 3/3  LOVABLE_API_KEY ━━━");
  console.log("LOVABLE_API_KEY is fully managed and can only be rotated through Lovable itself.");
  console.log("Ask the AI assistant in chat:");
  console.log("    «Rotate LOVABLE_API_KEY»");
  console.log("This invokes the internal `ai_gateway.rotate_lovable_api_key` tool, which");
  console.log("regenerates the key and propagates it to every edge function automatically.");
  console.log("No .env update is needed — the value is injected at runtime.");
}

try {
  console.log(`Project ref: ${projectRef}`);
  console.log(`Targets:     ${selected.join(", ")}`);
  console.log(`Env file:    ${ENV_PATH}`);
  console.log("");
  console.log("⚠ This is a sensitive operation. Run only on a trusted machine,");
  console.log("  never in shared CI. Make sure clipboard managers are disabled.");
  const go = await ask("Continue? [y/N] ");
  if (go.trim().toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  if (selected.includes("supabase")) await rotateSupabase();
  if (selected.includes("telegram")) await rotateTelegram();
  if (selected.includes("lovable")) await rotateLovable();

  console.log("\n━━━ Post-rotation checklist ━━━");
  console.log("  • Redeploy edge functions if you changed SUPABASE_SERVICE_ROLE_KEY:");
  console.log(`      supabase functions deploy --project-ref ${projectRef}`);
  console.log("  • Run `npm run og:check` and your test suite to confirm nothing broke.");
  console.log("  • Re-run the secret scanner: `gitleaks detect --no-banner`.");
  console.log("  • Commit nothing from this rotation — .env is gitignored.");
} finally {
  rl.close();
}
