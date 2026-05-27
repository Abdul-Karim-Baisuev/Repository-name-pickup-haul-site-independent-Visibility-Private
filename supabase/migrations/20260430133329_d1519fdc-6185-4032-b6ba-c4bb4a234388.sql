-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: notify-telegram on new booking_request
CREATE OR REPLACE FUNCTION public.notify_telegram_on_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text := 'https://ijalhgtxtenktmjipyxw.supabase.co/functions/v1/notify-telegram';
  v_anon text := 'REDACTED_LEGACY_ANON_JWT_2026_05_10';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon
    ),
    body := jsonb_build_object('booking_request_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert if notification fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_telegram_new_booking ON public.booking_requests;
CREATE TRIGGER trg_notify_telegram_new_booking
AFTER INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_telegram_on_new_booking();