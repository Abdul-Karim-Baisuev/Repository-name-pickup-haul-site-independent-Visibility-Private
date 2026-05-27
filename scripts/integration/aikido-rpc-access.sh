#!/usr/bin/env bash
# Integration checks for Aikido vault-secret RPCs against the live PostgREST API.
#
# Verifies:
#  1. anon (anon key, no JWT) cannot call either RPC — PostgREST returns 401/403/404
#     because EXECUTE on the function is revoked from PUBLIC and anon.
#  2. authenticated NON-admin user gets in-function 'forbidden' (HTTP 403/400 with
#     PostgREST error containing 'forbidden' and SQLSTATE 42501).
#  3. Status payload (when reachable) contains only the safe fields:
#     client_id_set, client_id_preview, client_secret_set — no raw secret.
#  4. Non-admin attempt to set credentials does NOT modify the vault (verified via
#     a follow-up admin-side read, run separately via supabase--read_query in CI).
#
# Run: bash scripts/integration/aikido-rpc-access.sh
# Required env: SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY),
#               SUPABASE_SERVICE_ROLE_KEY.
set -euo pipefail

BASE_URL="${SUPABASE_URL:-}"
ANON_KEY="${VITE_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-}}"
SR_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$BASE_URL" || -z "$ANON_KEY" || -z "$SR_KEY" ]]; then
  echo "FAIL: SUPABASE_URL / anon key / service role key must be set."
  exit 2
fi

FAILED=0
pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; FAILED=1; }

rpc_call() {
  # rpc_call <fn> <body> <jwt>
  curl -sS -o /tmp/rpc_body -w "%{http_code}" \
    -X POST "$BASE_URL/rest/v1/rpc/$1" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $3" \
    -H "Content-Type: application/json" \
    --data "$2"
}

# -------- 1. anon ACL --------
code=$(rpc_call "get_aikido_credentials_status" "{}" "$ANON_KEY")
body=$(cat /tmp/rpc_body)
if [[ "$code" =~ ^(401|403|404)$ ]] || echo "$body" | grep -qiE "permission denied|not.*allowed|forbidden"; then
  pass "anon cannot call get_aikido_credentials_status (HTTP $code)"
else
  fail "anon should be denied. HTTP $code body=$body"
fi

code=$(rpc_call "set_aikido_credentials" '{"_client_id":"x","_client_secret":"y"}' "$ANON_KEY")
body=$(cat /tmp/rpc_body)
if [[ "$code" =~ ^(401|403|404)$ ]] || echo "$body" | grep -qiE "permission denied|not.*allowed|forbidden"; then
  pass "anon cannot call set_aikido_credentials (HTTP $code)"
else
  fail "anon should be denied. HTTP $code body=$body"
fi

# -------- 2. authenticated non-admin user --------
TEST_EMAIL="aikido-rpc-test+$(date +%s)@example.com"
TEST_PASS="P@ssw0rd-$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"

# Create a confirmed user via Admin API.
created=$(curl -sS -X POST "$BASE_URL/auth/v1/admin/users" \
  -H "apikey: $SR_KEY" -H "Authorization: Bearer $SR_KEY" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"email_confirm\":true}")
USER_ID=$(echo "$created" | jq -r '.id // empty')
if [[ -z "$USER_ID" ]]; then
  fail "could not create test user. resp=$created"
  echo "Aborting further checks."
  exit 1
fi

cleanup() {
  curl -sS -X DELETE "$BASE_URL/auth/v1/admin/users/$USER_ID" \
    -H "apikey: $SR_KEY" -H "Authorization: Bearer $SR_KEY" >/dev/null || true
}
trap cleanup EXIT

# Sign in to get a real authenticated JWT.
signin=$(curl -sS -X POST "$BASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  --data "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
USER_JWT=$(echo "$signin" | jq -r '.access_token // empty')
if [[ -z "$USER_JWT" ]]; then
  fail "could not sign in test user. resp=$signin"
  exit 1
fi
pass "created test non-admin user $USER_ID and obtained JWT"

code=$(rpc_call "get_aikido_credentials_status" "{}" "$USER_JWT")
body=$(cat /tmp/rpc_body)
if echo "$body" | grep -qi "forbidden" || [[ "$code" == "403" ]]; then
  pass "authenticated non-admin denied by has_role check on getter (HTTP $code)"
else
  fail "expected 'forbidden' for non-admin getter. HTTP $code body=$body"
fi

code=$(rpc_call "set_aikido_credentials" '{"_client_id":"attacker","_client_secret":"attacker"}' "$USER_JWT")
body=$(cat /tmp/rpc_body)
if echo "$body" | grep -qi "forbidden" || [[ "$code" == "403" ]]; then
  pass "authenticated non-admin denied by has_role check on setter (HTTP $code)"
else
  fail "expected 'forbidden' for non-admin setter. HTTP $code body=$body"
fi

# -------- 3. Non-admin response schema — no secret leak. --------
if echo "$body" | grep -qiE '"client_secret"\s*:\s*"[^"]+"|"client_id"\s*:\s*"[^"]+"'; then
  fail "non-admin response unexpectedly contains raw secret/id fields. body=$body"
else
  pass "non-admin response carries no secret material"
fi

# -------- 4. authenticated admin user --------
ADMIN_EMAIL="aikido-rpc-admin+$(date +%s)@example.com"
ADMIN_PASS="P@ssw0rd-$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"

admin_created=$(curl -sS -X POST "$BASE_URL/auth/v1/admin/users" \
  -H "apikey: $SR_KEY" -H "Authorization: Bearer $SR_KEY" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"email_confirm\":true}")
ADMIN_ID=$(echo "$admin_created" | jq -r '.id // empty')
if [[ -z "$ADMIN_ID" ]]; then
  fail "could not create test admin user. resp=$admin_created"
  exit 1
fi

# Extend cleanup to drop both users + the role row.
cleanup() {
  curl -sS -X DELETE "$BASE_URL/auth/v1/admin/users/$USER_ID" \
    -H "apikey: $SR_KEY" -H "Authorization: Bearer $SR_KEY" >/dev/null || true
  curl -sS -X DELETE "$BASE_URL/rest/v1/user_roles?user_id=eq.$ADMIN_ID" \
    -H "apikey: $SR_KEY" -H "Authorization: Bearer $SR_KEY" \
    -H "Prefer: return=minimal" >/dev/null || true
  curl -sS -X DELETE "$BASE_URL/auth/v1/admin/users/$ADMIN_ID" \
    -H "apikey: $SR_KEY" -H "Authorization: Bearer $SR_KEY" >/dev/null || true
}
trap cleanup EXIT

# Grant admin role via service-role REST (bypasses RLS).
role_resp=$(curl -sS -o /tmp/role_body -w "%{http_code}" -X POST "$BASE_URL/rest/v1/user_roles" \
  -H "apikey: $SR_KEY" -H "Authorization: Bearer $SR_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  --data "{\"user_id\":\"$ADMIN_ID\",\"role\":\"admin\"}")
if [[ "$role_resp" != "201" && "$role_resp" != "200" ]]; then
  fail "could not grant admin role. HTTP $role_resp body=$(cat /tmp/role_body)"
  exit 1
fi

admin_signin=$(curl -sS -X POST "$BASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
ADMIN_JWT=$(echo "$admin_signin" | jq -r '.access_token // empty')
if [[ -z "$ADMIN_JWT" ]]; then
  fail "could not sign in admin. resp=$admin_signin"
  exit 1
fi
pass "created test admin user $ADMIN_ID and obtained JWT"

# 4a. Admin getter must succeed.
code=$(rpc_call "get_aikido_credentials_status" "{}" "$ADMIN_JWT")
body=$(cat /tmp/rpc_body)
if [[ "$code" != "200" ]]; then
  fail "admin getter expected HTTP 200, got $code body=$body"
else
  pass "admin can call get_aikido_credentials_status (HTTP 200)"
fi

# Validate exact safe schema: 3 documented keys, two booleans + one string|null.
shape=$(echo "$body" | jq -r '
  if type == "object" then
    (keys | sort | join(",")) + "|" +
    (.client_id_set|type) + "|" +
    (.client_secret_set|type) + "|" +
    (.client_id_preview|type)
  else "not_object" end
' 2>/dev/null || echo "parse_error")

if [[ "$shape" == "client_id_preview,client_id_set,client_secret_set|boolean|boolean|"* ]]; then
  pass "admin response shape is exactly {client_id_set,client_secret_set,client_id_preview}"
else
  fail "admin response schema unexpected. shape=$shape body=$body"
fi

# Explicit secret-leak guards.
if echo "$body" | jq -e 'has("client_secret") or has("aikido_client_secret") or has("secret")' >/dev/null 2>&1; then
  fail "admin response contains secret-bearing key. body=$body"
else
  pass "admin response contains no secret-bearing keys"
fi
if echo "$body" | jq -e 'has("client_id") or has("aikido_client_id")' >/dev/null 2>&1; then
  fail "admin response leaks raw client_id. body=$body"
else
  pass "admin response carries no raw client_id (only masked preview)"
fi

preview=$(echo "$body" | jq -r '.client_id_preview // ""')
if [[ -z "$preview" || "$preview" == *"•"* ]]; then
  pass "client_id_preview is masked or absent ('$preview')"
else
  fail "client_id_preview not masked: '$preview'"
fi

# 4b. Admin setter with empty inputs is a no-op and must succeed without leak.
code=$(rpc_call "set_aikido_credentials" '{"_client_id":"","_client_secret":""}' "$ADMIN_JWT")
body=$(cat /tmp/rpc_body)
if [[ "$code" == "200" || "$code" == "204" ]]; then
  pass "admin can call set_aikido_credentials with empty no-op inputs (HTTP $code)"
else
  fail "admin setter expected 200/204, got $code body=$body"
fi
if echo "$body" | grep -qiE '"client_secret"|"aikido_client_secret"|"secret"\s*:\s*"[^"]+"'; then
  fail "admin setter response leaked secret-bearing field. body=$body"
else
  pass "admin setter response contains no secret material"
fi

echo
if [[ $FAILED -eq 0 ]]; then
  echo "All Aikido RPC integration checks PASSED."
  exit 0
else
  echo "Some Aikido RPC integration checks FAILED."
  exit 1
fi
