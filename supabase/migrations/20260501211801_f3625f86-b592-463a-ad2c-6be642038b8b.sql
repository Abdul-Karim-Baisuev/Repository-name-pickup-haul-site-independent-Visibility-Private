-- Lock down SECURITY DEFINER functions: revoke EXECUTE from PUBLIC and roles
-- that should not be able to call them via PostgREST. Keep explicit grants
-- only for functions that are intentionally exposed to anon/authenticated.

-- 1) Internal helpers / triggers / cron-only — revoke from everyone in API.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_app_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_telegram_on_new_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_email_on_new_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_booking_email_attempt(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_booking_email_attempts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_estimate_public_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_estimate_code() FROM PUBLIC, anon, authenticated;

-- 2) Functions that must remain callable by anon (public tracking lookup
--    by code + last 4 digits of phone). Lock to anon/authenticated only.
REVOKE EXECUTE ON FUNCTION public.get_tracking_for_code(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_tracking_for_code(text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_estimate_status(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_estimate_status(text, text) TO anon, authenticated;

-- 3) Functions intended only for signed-in users. Revoke from PUBLIC/anon,
--    keep explicit grant for authenticated. Authorization is enforced inside
--    the function bodies (via has_role / auth.uid()).
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_none() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_admin_if_none() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_driver_role() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_driver_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_aikido_credentials(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_aikido_credentials(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_aikido_credentials_status() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_aikido_credentials_status() TO authenticated;

-- 4) has_role is referenced by RLS policies and by edge functions via RPC
--    with an authenticated JWT. Restrict from PUBLIC/anon, allow authenticated.
--    RLS policies run as the table owner and don't need EXECUTE on this role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;