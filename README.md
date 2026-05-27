# PICKUP HAUL — AutoBais LLC

Pickup truck hauling business website (California / SoCal). Built on Lovable
(React 18 + Vite + Tailwind) with Lovable Cloud (Supabase) for backend,
auth, edge functions and transactional email.

- Preview: https://id-preview--d6b44d98-f0d3-4b17-af85-e62ef9926be4.lovable.app
- Production: https://www.autobais.app · https://autobais.app

---

## Useful scripts

| Command                     | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `npm run dev`               | Local dev server                                         |
| `npm run build`             | Production build (auto-runs `og:optimize` via prebuild)  |
| `npm run og:optimize`       | Re-compress OG images (JPG + WebP via cwebp)             |
| `npm run secrets:rotate`    | Interactive secret rotation assistant                    |
| `npm run secrets:verify`    | Post-rotation smoke checks (edge functions + Vault)      |

See [`public/og/README.md`](public/og/README.md) for the OG asset pipeline
and [`docs/security/secret-scanning.md`](docs/security/secret-scanning.md)
for the gitleaks CI setup.

---

## 🔐 Rotating credentials

If a secret has (or might have) leaked — to git history, to logs, to a
shared screen, to a third party — **assume it is compromised** and rotate
it immediately. Rotation is not destructive; you can rotate as a precaution.

The repository ships with an interactive helper:

```bash
npm run secrets:rotate                    # rotate all three
npm run secrets:rotate supabase           # rotate one
npm run secrets:rotate telegram lovable
```

The helper updates `.env` and (where possible) the Supabase Vault for you.
The manual portions of each rotation — the parts that involve a
third-party UI or a Lovable-managed key — are documented below so you can
also do them by hand.

> **Run rotations only on a trusted machine.** Disable clipboard managers
> first; tokens you paste end up in shell history and clipboard logs.

---

### 1. Supabase `service_role` JWT

The `service_role` key bypasses Row-Level Security. It is used by the
`notify_telegram_on_new_booking` trigger via the Vault entry
`service_role_jwt`, and by edge functions through the
`SUPABASE_SERVICE_ROLE_KEY` runtime secret.

**Step-by-step**

1. **Generate a new key** in the Lovable Cloud dashboard:
   `Project Settings → API Keys → service_role → Generate new key`.
   Copy the new JWT (starts with `eyJ…`).

2. **Update the runtime secret** (used by edge functions). Either:
   - run `npm run secrets:rotate supabase` and paste the JWT when prompted, **or**
   - update the `SUPABASE_SERVICE_ROLE_KEY` secret manually via the Lovable
     project secrets UI.

3. **Update the Vault entry** used by the booking trigger. The helper does
   this automatically; to do it by hand, run in the Lovable Cloud SQL editor:

   ```sql
   SELECT CASE
     WHEN EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_jwt')
     THEN vault.update_secret(
       (SELECT id FROM vault.secrets WHERE name = 'service_role_jwt'),
       '<NEW_JWT>',
       'service_role_jwt'
     )::text
     ELSE vault.create_secret(
       '<NEW_JWT>',
       'service_role_jwt',
       'Service role JWT for trigger callbacks'
     )::text
   END;
   ```

   …or via the Supabase CLI:

   ```bash
   supabase db execute \
     --project-ref ijalhgtxtenktmjipyxw \
     --sql "SELECT vault.update_secret( \
       (SELECT id FROM vault.secrets WHERE name='service_role_jwt'), \
       '<NEW_JWT>', 'service_role_jwt');"
   ```

4. **Redeploy edge functions** so they pick up the new runtime secret:

   ```bash
   supabase functions deploy --project-ref ijalhgtxtenktmjipyxw
   ```

5. **Smoke test**: submit a test booking from the site and confirm the
   Telegram notification arrives. Check edge logs for any 401 from the
   `notify-telegram` function.

---

### 2. Telegram bot token (`TELEGRAM_API_KEY`)

Telegram has no rotation API — you re-issue the token via @BotFather.

1. In Telegram, message **@BotFather** → `/revoke` → pick the bot →
   copy the new token (`<bot_id>:<35+ char secret>`).
2. Update the connector secret:
   - run `npm run secrets:rotate telegram` and paste the new token, **or**
   - open the Lovable project → **Connectors → Telegram** and paste the
     new token there. `TELEGRAM_API_KEY` is connector-managed, so it must
     be updated through the connector UI (not the generic secrets tool).
3. **Smoke test**: trigger `telegram-send-test` from the admin panel
   (or `supabase functions invoke telegram-send-test`) and confirm a
   message lands in the operations chat.

---

### 3. `LOVABLE_API_KEY`

`LOVABLE_API_KEY` is a Lovable-managed secret used by edge functions that
call the Lovable AI Gateway. It can **only** be rotated through Lovable
itself — there is no dashboard button and no CLI command.

1. In the Lovable chat for this project, ask:
   > **«Rotate LOVABLE_API_KEY»**

   The assistant invokes the internal `rotate_lovable_api_key` tool, which
   regenerates the key and propagates it to every edge function
   automatically.
2. No `.env` change is needed — the value is injected at runtime.
3. **Smoke test**: invoke any AI-using edge function (for example via the
   admin panel) and confirm it succeeds.

---

## ✅ Post-rotation checklist

After rotating any credential, walk through this list:

- [ ] `.env` updated (for `SUPABASE_SERVICE_ROLE_KEY` / `TELEGRAM_API_KEY`).
      `LOVABLE_API_KEY` is runtime-injected and is **not** in `.env`.
- [ ] Vault entry `service_role_jwt` updated (Supabase rotation only).
- [ ] Edge functions redeployed:
      `supabase functions deploy --project-ref ijalhgtxtenktmjipyxw`.
- [ ] Smoke test for the rotated surface:
      bookings → Telegram (Supabase + Telegram), AI features (Lovable).
- [ ] Edge function logs show no 401 / auth errors after the change.
- [ ] Run the secret scanner to make sure nothing leaked into the repo:
      `gitleaks detect --config .gitleaks.toml --no-banner`.
- [ ] Nothing from the rotation is staged for commit
      (`git status` should be clean — `.env` is gitignored).
- [ ] If the rotation was triggered by a suspected leak: open an incident
      note, list every place the old key was used, and confirm none of
      them still have the old value cached.

---

## 🔎 Post-rotation verification commands

Run these from a trusted machine after rotating any of the credentials
above. The bundled helper wraps them all:

```bash
npm run secrets:verify                        # all checks
npm run secrets:verify supabase vault         # subset
ADMIN_JWT=eyJ... npm run secrets:verify telegram lovable
```

`ADMIN_JWT` is the access token of a logged-in admin user (copy it from
`localStorage` in the browser → `sb-<ref>-auth-token` → `access_token`).
It's only needed for the Telegram / Lovable checks because those edge
functions require an authenticated admin caller.

### Manual equivalents

**1. Supabase service-role JWT** — call `notify-telegram` with the new
service-role key. A 404 (or 412 if `telegram_chat_id` isn't set) means
auth was accepted; a 401/403 means the rotation didn't propagate.

```bash
curl -i -X POST \
  "https://ijalhgtxtenktmjipyxw.supabase.co/functions/v1/notify-telegram" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"booking_request_id":"00000000-0000-0000-0000-000000000000"}'
```

**2. Vault entry `service_role_jwt`** — confirm the booking trigger has a
fresh JWT to read. Length should be > 200 characters.

```bash
supabase db execute --project-ref ijalhgtxtenktmjipyxw \
  --sql "SELECT length(decrypted_secret) AS jwt_len
         FROM vault.decrypted_secrets
         WHERE name = 'service_role_jwt';"
```

**3. `notify-telegram` end-to-end** — insert a real booking and watch the
trigger fire. A success row in `telegram_send_logs` proves the full
chain (trigger → Vault JWT → edge function → Telegram gateway) works.

```bash
supabase db execute --project-ref ijalhgtxtenktmjipyxw --sql "
  INSERT INTO public.booking_requests
    (name, email, phone, service_type, preferred_date, address, description)
  VALUES
    ('Rotation Test', 'rotation+test@autobais.com', '+15555550100',
     'hauling', current_date, 'Van Nuys, CA', 'verify-rotation smoke test')
  RETURNING id;
"
# then:
supabase db execute --project-ref ijalhgtxtenktmjipyxw --sql "
  SELECT created_at, source, status, http_status, message_id, error
  FROM public.telegram_send_logs
  ORDER BY created_at DESC LIMIT 3;
"
```

Expected: most recent row has `source = 'notify-telegram:booking'`,
`status = 'success'`, `http_status = 200`. Delete the test booking
afterwards.

**4. Telegram bot token** — round-trip through the connector via the
admin-only test function:

```bash
supabase functions invoke telegram-send-test \
  --project-ref ijalhgtxtenktmjipyxw \
  --header "Authorization: Bearer $ADMIN_JWT"
```

Expect `{ "ok": true, "message_id": ... }` and a message in the chat
configured under `app_settings.telegram_chat_id`.

**5. `LOVABLE_API_KEY`** — exercises the Lovable AI gateway path used by
every Telegram call:

```bash
supabase functions invoke telegram-get-updates \
  --project-ref ijalhgtxtenktmjipyxw \
  --header "Authorization: Bearer $ADMIN_JWT"
```

A 200 response (even with `raw_count: 0`) confirms the gateway accepted
`LOVABLE_API_KEY`. A 401/403 from the gateway means the new key didn't
propagate — re-run the rotate flow.

**6. Edge function logs** — final sanity check; there should be no recent
401/403 entries on `notify-telegram` or `telegram-send-test`:

```bash
supabase functions logs notify-telegram   --project-ref ijalhgtxtenktmjipyxw --tail
supabase functions logs telegram-send-test --project-ref ijalhgtxtenktmjipyxw --tail
```

---

## 🤖 CI verification (GitHub Actions)

The workflow [`secrets-verify.yml`](.github/workflows/secrets-verify.yml)
runs `npm run secrets:verify` against the live backend. It has two modes:

- **Manual** (`workflow_dispatch`) — trigger from the **Actions** tab right
  after rotating a secret. Runs in the **`production-secrets`** environment
  (full check set, including Telegram + Lovable).
- **Pull request** — runs automatically when the rotation tooling itself
  changes (`scripts/rotate-secrets.mjs`, `scripts/verify-rotation.mjs`,
  the workflow file, or `package.json`). Runs only the read-only
  `supabase` + `vault` checks in the **`ci-readonly`** environment.

### One-time setup

1. **Create two GitHub Environments**
   (`Settings → Environments → New environment`):
   - `production-secrets` — add **Required reviewers** (at least 1 admin)
     and a deployment branch rule limiting it to `main`.
   - `ci-readonly` — add **Required reviewers** so PRs from forks /
     untrusted contributors gate on a human approval before secrets are
     exposed to the runner.

2. **Add environment secrets** to each environment:
   - `SUPABASE_SERVICE_ROLE_KEY` — the freshly rotated service-role JWT.
     **Update this every time you rotate**, otherwise the next CI run
     will fail with 401.
   - `SUPABASE_ACCESS_TOKEN` — a personal access token from
     https://supabase.com/dashboard/account/tokens. Used by
     `supabase db execute` to read the Vault entry.
   - `ADMIN_JWT` *(optional, manual runs only)* — access token of an
     admin user, copied from the browser's `sb-<ref>-auth-token` cookie.
     Required for the `telegram` and `lovable` checks; without it those
     checks are reported as skipped.
   - `SLACK_WEBHOOK_URL` *(optional but recommended)* — Slack
     [Incoming Webhook](https://api.slack.com/messaging/webhooks) URL
     for the channel that should receive verification results. Add it
     to **both** `production-secrets` and `ci-readonly` so manual
     dispatches and PR runs both notify. If absent, the Slack step is
     skipped silently and never blocks the gate.

3. **Mark the workflow as a required check**
   (`Settings → Branches → Branch protection rules → main → Require
   status checks to pass before merging`) and select **`secrets:verify`**.
   This blocks merges to `main` whenever the verification fails.

### Slack notifications

Every run (success **and** failure) posts a single message to the
configured Slack channel containing:

- ✅ / 🚨 status headline (failure messages explicitly say
  *"do NOT merge / do NOT mark rotation complete"*)
- Trigger (`pull_request` or `workflow_dispatch`), actor, and ref
- A direct link to the GitHub Actions run (where the full
  `secrets-verify-log` artifact is downloadable)
- The tail of `verify.log` (~3.5 KB) inline as a code block, so the
  on-call engineer can triage from Slack without leaving the channel

Notifications are best-effort — a failed Slack POST is logged as a
GitHub Actions warning but never fails the job, so missing webhook
configuration cannot mask a real verification failure.

### Operator runbook

Right after rotating a secret:

1. Update `SUPABASE_SERVICE_ROLE_KEY` (and `ADMIN_JWT`, if you use it) in
   the `production-secrets` environment.
2. Open **Actions → Verify rotated secrets → Run workflow**, leave
   "checks" empty to run everything, and submit.
3. Approve the deployment when GitHub prompts for it
   (Required reviewers gate).
4. Wait for the green check, then download the `secrets-verify-log`
   artifact and attach it to the rotation incident note. The same
   summary will land in Slack automatically.
5. If the run is red: do **not** mark the rotation complete. Inspect the
   log (linked from the Slack message), fix the offending step
   (re-rotate, re-deploy edge functions, or re-sync the connector
   secret), and re-run.
