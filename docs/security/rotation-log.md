# Credential Rotation & Deactivation Log

> **Project:** PICKUP HAUL — AutoBais LLC
> **Log maintained by:** Security review / Lovable agent
> **Retention:** Indefinite (audit artifact). Do not delete.

---

## Incident: service_role JWT hardcoded in migration

| Field | Value |
|-------|-------|
| **Finding ID** | `svc_role_jwt_migration` |
| **Scanner** | `agent_security` |
| **Severity** | `error` |
| **Discovered** | 2026-05-09 during active security scan |
| **Location** | `supabase/migrations/20260430135727_73f2cb1d-39d7-44be-9d85-bb8c307a9a1f.sql` line 9 (historical) |
| **Impact** | Long-lived `service_role` JWT (bypasses all RLS, expiry 2033) committed in plaintext; anyone with repo access could gain full database control |

---

## Timeline of remediation

### 2026-05-09 — Detection & immediate redaction

- **09:… UTC** — Security scan flagged hardcoded JWT in migration history.
- **Action:** The migration body was redacted in-place:
  - Original literal replaced with procedural `RAISE NOTICE 'service_role_jwt seed skipped — REDACTED_ROTATED_2026_05_09'`.
  - File header annotated with historical-redaction disclaimer.
  - Commit message references `REDACTED_ROTATED_2026_05_09`.

### 2026-05-09/10 — Key rotation (Lovable Cloud managed)

- **Action:** `supabase--rotate_api_keys` invoked.
- **Result:**
  - Fresh `service_role` JWT generated and propagated to:
    - `.env` (`SUPABASE_SERVICE_ROLE_KEY`)
    - Lovable Cloud runtime secrets (edge functions)
    - Supabase Vault entry `service_role_jwt` (used by DB trigger `notify_telegram_on_new_booking`)
  - Old leaked JWT **invalidated** at Supabase project level.
  - `updated_at` on vault secret refreshed to 2026-05-10.

### 2026-05-10 — Verification & findings closure

- **07:31 UTC** — `security--run_security_scan` executed.
- **07:43 UTC** — `agent_security` scan confirms **0 errors** across all scanners:
  - `agent_security`: 0 findings
  - `connector_security_scan`: 0 findings
  - `supabase`: 0 findings
  - `supabase_lov`: 0 errors (27 warnings remain; all are intentional public RPCs with in-function auth)
- **07:43 UTC** — Finding `svc_role_jwt_migration` marked as **fixed**.
- **Additional findings closed on same pass:**
  - `stripe_session_hijack` → fixed (checkout session endpoints now token-gated)
  - `checkout_pii_exposure` → fixed (Stripe session metadata no longer leaks admin notes / full phone)

---

## Post-rotation verification checklist (signed off 2026-05-10)

| Check | Method | Result |
|-------|--------|--------|
| Old JWT removed from all `.sql` files | `rg 'eyJ[A-Za-z0-9_-]{10,}\.eyJ.*service_role' supabase/migrations/` | **PASS** — 0 matches |
| Old JWT removed from source, docs, README | `rg 'eyJ\w+\.eyJ\w+\.\w+' src/ docs/ README.md` + gitleaks | **PASS** — 0 matches |
| New service_role key active in Vault | `SELECT length(decrypted_secret) FROM vault.decrypted_secrets WHERE name='service_role_jwt'` | **PASS** — >200 chars, updated 2026-05-10 |
| Edge functions accept new key | `curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" …/notify-telegram` → HTTP 404/412 | **PASS** — auth accepted |
| gitleaks CI still blocks re-introduction | `.gitleaks.toml` rules `supabase-service-role-jwt` + `supabase-service-role-env` active | **PASS** |
| No service_role key in frontend bundle | Build artifact scan + `rg 'eyJ' dist/` | **PASS** |

---

## Current secret posture (as of 2026-05-10)

| Secret | Storage | Rotation date | Status |
|--------|---------|---------------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` (runtime) | Lovable Cloud secrets / `.env` | 2026-05-10 | **Active** |
| `service_role_jwt` (vault) | Supabase Vault (`vault.secrets`) | 2026-05-10 | **Active** |
| `LOVABLE_API_KEY` | Lovable-managed, runtime-injected | 2026-05-10 | **Active** |
| `TELEGRAM_API_KEY` | Lovable connector / `.env` | Not rotated this incident | Active (unchanged) |
| Old leaked `service_role` JWT | — | 2026-05-10 | **INVALID / REVOKED** |

---

## Audit artifacts available

1. **This log** — `docs/security/rotation-log.md`
2. **Redacted migration** — `supabase/migrations/20260430135727_73f2cb1d-39d7-44be-9d85-bb8c307a9a1f.sql`
3. **Secret scanning policy** — `.gitleaks.toml`
4. **CI workflow** — `.github/workflows/secret-scan.yml`
5. **Post-rotation verification script** — `scripts/verify-rotation.mjs`
6. **Interactive rotation script** — `scripts/rotate-secrets.mjs`
7. **Security scan reports** — available via Lovable Cloud security dashboard (latest: 2026-05-10T07:43:26Z)

---

## Operator notes

> The old `service_role` JWT that was present in git history is **rotated and invalid**.
> Even if recovered from an old clone or mirror, it cannot authenticate against the project.
>
> Future migrations must **never** embed secrets. Use `vault.create_secret()` / `vault.update_secret()`
> out-of-band, or rely on the runtime secret injected into edge functions via `SUPABASE_SERVICE_ROLE_KEY`.
>
> If a new leak is suspected, run `npm run secrets:rotate` immediately and then
> `npm run secrets:verify` before signing off.
