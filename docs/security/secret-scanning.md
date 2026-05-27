# Secret scanning

This repository runs **gitleaks** on every pull request and push to `main`
via `.github/workflows/secret-scan.yml`. The job fails (and blocks merge,
once added as a required status check) if any committed file matches a
secret pattern.

## What is detected

In addition to gitleaks' built-in rules (AWS keys, GitHub tokens, Stripe
keys, generic high-entropy strings, etc.), `.gitleaks.toml` adds rules for
secrets specific to this project:

| Rule ID                       | Catches                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `supabase-service-role-jwt`   | Any JWT whose payload contains `"role":"service_role"`         |
| `supabase-service-role-env`   | `SUPABASE_SERVICE_ROLE_KEY=eyJ...` style assignments           |
| `telegram-bot-token`          | Telegram bot tokens (`<bot_id>:<35+ char secret>`)             |
| `lovable-api-key`             | `LOVABLE_API_KEY=...` assignments                              |

## What is allowed

Supabase **anon / publishable** keys (`role: "anon"`) are designed to be
public and are bundled into the frontend — they are explicitly allowlisted.

## Run locally before pushing

```bash
# One-time install (macOS)
brew install gitleaks

# Scan the working tree
gitleaks detect --config .gitleaks.toml --verbose

# Scan only what you're about to commit
gitleaks protect --staged --config .gitleaks.toml --verbose
```

You can also wire `gitleaks protect --staged` into a `pre-commit` hook so
secrets are caught before they ever leave your machine.

## If a real secret is detected

1. **Rotate the credential immediately** — assume it is compromised the
   moment it is committed (history rewrites do not help; it is already in
   clones, forks, mirrors, and CI logs).
   - Supabase `service_role`: rotate via Project Settings → API.
   - `LOVABLE_API_KEY`: use the Lovable rotate-key tool.
   - Telegram bot: re-issue the token via @BotFather.
2. Remove the secret from the codebase and replace it with an env var or
   Supabase Vault reference.
3. Re-run the workflow to confirm the scan is green.
