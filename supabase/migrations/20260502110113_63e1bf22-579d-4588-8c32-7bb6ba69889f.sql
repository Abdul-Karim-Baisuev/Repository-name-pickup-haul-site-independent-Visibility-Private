-- Defense-in-depth: revoke EXECUTE on internal SECURITY DEFINER functions
-- from anon and authenticated. These functions are only called by:
--   - database triggers (run as table owner, unaffected by role grants)
--   - the email queue dispatcher (uses service_role, unaffected)
--   - cron jobs (run as postgres, unaffected)
-- No frontend, admin, or driver code paths call them directly.

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)                          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)                          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)              FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.send_booking_email_attempt(uuid, integer)           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_booking_email_attempts()                  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_telegram_on_new_booking()                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_email_on_new_booking()                       FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()                                   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_locations_on_delivery_end()                   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trim_driver_locations()                             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()                          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_app_settings()                                FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_estimate_public_code()                          FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_estimate_code()                            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_tracking_token()                           FROM anon, authenticated;