REVOKE EXECUTE ON FUNCTION public.notify_telegram_on_new_estimate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_email_on_new_estimate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_estimate_email_attempt(uuid, text, text) FROM PUBLIC, anon, authenticated;