# Integration access checks

## `aikido-rpc-access.sh`

End-to-end check that **only an admin** can read or update Aikido vault secrets via the
`get_aikido_credentials_status` / `set_aikido_credentials` RPCs.

It runs against the **live PostgREST API** (no mocks) and exercises three identities:

| Identity | Expected outcome |
|---|---|
| `anon` (anon key, no JWT) | HTTP 401 — blocked by ACL (EXECUTE revoked from `anon`/`PUBLIC`) |
| Authenticated non-admin user (created on the fly via Auth Admin API) | HTTP 403 with `forbidden` from the in-function `has_role` check |
| Admin | (covered by Vitest unit tests in `src/pages/AdminIntegrations.test.tsx`) |

The script also asserts that the response body never includes raw `client_id` or
`client_secret` fields, and the temporary user is deleted on exit.

### Required environment

- `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (only used to create/sign-in/delete the test user)

### Run

```bash
bash scripts/integration/aikido-rpc-access.sh
```

Exit code `0` → all checks passed.

### Why not run from `psql`

The Supabase pooler role cannot `SET ROLE` to `anon` / `authenticated` and has no
access to `vault.*`, so role-based ACL behaviour can only be exercised end-to-end
through PostgREST with a real JWT.

## CI

Workflow `.github/workflows/integration-aikido-rpc.yml` runs this script automatically on every PR and push to `main`.

Required GitHub Actions secrets (Settings → Secrets and variables → Actions):

- `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The job also runs a defense-in-depth grep over the captured output and fails if any secret-bearing JSON key (`client_secret`, `aikido_client_secret`, `aikido_client_id`) leaks, or if `client_id_preview` ever appears unmasked.
