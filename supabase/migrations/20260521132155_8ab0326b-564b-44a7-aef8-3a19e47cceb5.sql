-- Revoke direct EXECUTE on internal-only SECURITY DEFINER helpers.
-- These are intended to be called from triggers or service_role edge functions
-- only. Triggers run as the function owner regardless of EXECUTE grants,
-- so revoking from anon/authenticated/PUBLIC is safe.

-- Rate-limit helpers (called from edge functions via service_role only)
REVOKE EXECUTE ON FUNCTION public.check_mapbox_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_mapbox_rate_hits() FROM PUBLIC, anon, authenticated;

-- Token / code generators (used by triggers only; should not be guessable
-- helpers exposed to clients)
REVOKE EXECUTE ON FUNCTION public.generate_estimate_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_tracking_token() FROM PUBLIC, anon, authenticated;

-- Trigger functions — not meant to be invoked directly by clients
REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_estimate_payment_token() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_estimate_public_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_app_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trim_driver_locations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_estimate_payment_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_email_on_new_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_email_on_new_estimate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_telegram_on_new_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_telegram_on_new_estimate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_locations_on_delivery_end() FROM PUBLIC, anon, authenticated;

-- Email queue / send helpers (service_role only; called from cron + triggers)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_booking_email_attempt(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_estimate_email_attempt(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_booking_email_attempts() FROM PUBLIC, anon, authenticated;

-- Functions intentionally kept callable:
--   has_role(uuid, app_role)              -- used by RLS policies
--   is_own_active_driver_topic(text)      -- used by realtime RLS
--   claim_admin_if_none()                 -- self-bootstrap, internal guard
--   claim_driver_role()                   -- admin guard inside the function
--   get_aikido_credentials_status()       -- admin guard inside the function
--   set_aikido_credentials(text, text)    -- admin guard inside the function
--   submit_estimate_request(...)          -- public quote form (validated)
--   get_estimate_status(text, text)       -- public tracking (rate-limited)
--   get_tracking_by_token(text, text)     -- public tracking (rate-limited)
--   get_customer_orders(text, text)       -- portal lookup (rate-limited)
