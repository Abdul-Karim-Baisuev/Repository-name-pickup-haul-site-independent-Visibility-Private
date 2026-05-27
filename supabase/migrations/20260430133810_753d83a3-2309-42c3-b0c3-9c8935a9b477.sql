CREATE OR REPLACE FUNCTION public.notify_email_on_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text := 'https://ijalhgtxtenktmjipyxw.supabase.co/functions/v1/send-transactional-email';
  v_anon text := 'REDACTED_LEGACY_ANON_JWT_2026_05_10';
BEGIN
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'apikey', v_anon
    ),
    body := jsonb_build_object(
      'templateName', 'booking-internal',
      'recipientEmail', 'contact@autobais.com',
      'idempotencyKey', 'booking-internal-' || NEW.id::text,
      'templateData', jsonb_build_object(
        'name', NEW.name,
        'email', NEW.email,
        'phone', NEW.phone,
        'serviceType', NEW.service_type,
        'preferredDate', NEW.preferred_date,
        'preferredTime', NEW.preferred_time,
        'address', NEW.address,
        'description', NEW.description,
        'bookingId', NEW.id::text
      )
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_email_on_new_booking() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_email_new_booking ON public.booking_requests;
CREATE TRIGGER trg_notify_email_new_booking
AFTER INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_email_on_new_booking();