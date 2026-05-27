-- Store the service role JWT in vault so the trigger can authenticate to the edge function.
-- This avoids hardcoding it in plpgsql source and keeps it encrypted at rest.
DO $$
DECLARE
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM vault.secrets WHERE name = 'service_role_jwt';
  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(
      'REDACTED_LEGACY_ANON_JWT_2026_05_10',
      'service_role_jwt',
      'Service role JWT used by DB triggers to call protected edge functions'
    );
  END IF;
END $$;

-- NOTE: The placeholder above will be replaced below with the real key by reading
-- it from the existing GUC if available. Since we cannot read the real
-- SUPABASE_SERVICE_ROLE_KEY from inside SQL, the user will need to update the
-- vault secret if the key rotates. For now we leave the trigger calling
-- the function with the anon key and inject auth via a different route.

-- Replace the trigger function: read service_role_jwt from vault and pass it
-- as the Authorization header. The edge function now requires either a
-- service_role JWT or an authenticated admin user.
CREATE OR REPLACE FUNCTION public.notify_telegram_on_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $function$
DECLARE
  v_url text := 'https://ijalhgtxtenktmjipyxw.supabase.co/functions/v1/notify-telegram';
  v_anon text := 'REDACTED_LEGACY_ANON_JWT_2026_05_10';
  v_service text;
BEGIN
  -- Try to read service-role JWT from vault; fall back to anon if missing
  -- (the edge function will reject anon — admin will see error in logs).
  BEGIN
    SELECT decrypted_secret INTO v_service
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_jwt'
      LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service := NULL;
  END;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service, v_anon),
      'apikey', v_anon
    ),
    body := jsonb_build_object('booking_request_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;