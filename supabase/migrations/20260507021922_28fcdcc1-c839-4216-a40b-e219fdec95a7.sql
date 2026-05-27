CREATE TABLE IF NOT EXISTS public.estimate_email_send_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id  uuid NOT NULL REFERENCES public.estimate_requests(id) ON DELETE CASCADE,
  template     text NOT NULL,
  attempt      integer NOT NULL DEFAULT 1,
  request_id   bigint,
  status       text NOT NULL DEFAULT 'pending',
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_email_send_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read estimate email attempts" ON public.estimate_email_send_attempts;
CREATE POLICY "admins read estimate email attempts"
  ON public.estimate_email_send_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_telegram_on_new_estimate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $fn$
DECLARE
  v_url text := 'https://ijalhgtxtenktmjipyxw.supabase.co/functions/v1/notify-telegram';
  v_anon text := 'REDACTED_LEGACY_ANON_JWT_2026_05_10';
  v_service text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_service
      FROM vault.decrypted_secrets WHERE name = 'service_role_jwt' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_service := NULL;
  END;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service, v_anon),
      'apikey', v_anon
    ),
    body := jsonb_build_object('estimate_request_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.send_estimate_email_attempt(
  _estimate_id uuid,
  _template text,
  _recipient text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $fn$
DECLARE
  v_url     text := 'https://ijalhgtxtenktmjipyxw.supabase.co/functions/v1/send-transactional-email';
  v_anon    text := 'REDACTED_LEGACY_ANON_JWT_2026_05_10';
  v_service text;
  v_row     public.estimate_requests%ROWTYPE;
  v_req_id  bigint;
  v_attempt_id uuid;
  v_data    jsonb;
BEGIN
  SELECT * INTO v_row FROM public.estimate_requests WHERE id = _estimate_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  BEGIN
    SELECT decrypted_secret INTO v_service
      FROM vault.decrypted_secrets WHERE name = 'service_role_jwt' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_service := NULL;
  END;

  IF v_service IS NULL THEN
    INSERT INTO public.estimate_email_send_attempts
      (estimate_id, template, attempt, status, last_error)
    VALUES
      (_estimate_id, _template, 1, 'failed',
       'Missing vault secret service_role_jwt; email not sent')
    RETURNING id INTO v_attempt_id;
    RETURN v_attempt_id;
  END IF;

  v_data := jsonb_build_object(
    'name',             v_row.name,
    'email',            v_row.email,
    'phone',            v_row.phone,
    'serviceType',      v_row.service_type,
    'serviceDirection', v_row.service_direction,
    'stops',            COALESCE(v_row.stops, '[]'::jsonb),
    'distanceMiles',    v_row.distance_miles,
    'preferredDate',    v_row.preferred_date,
    'preferredTime',    v_row.preferred_time,
    'itemQuantity',     v_row.item_quantity,
    'itemWeightLbs',    v_row.item_weight_lbs,
    'itemDimensions',   v_row.item_dimensions,
    'notes',            v_row.notes,
    'requestId',        v_row.id::text
  );

  v_req_id := net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service,
      'apikey', v_anon
    ),
    body := jsonb_build_object(
      'templateName',   _template,
      'recipientEmail', _recipient,
      'idempotencyKey', _template || '-' || v_row.id::text,
      'templateData',   v_data
    ),
    timeout_milliseconds := 10000
  );

  INSERT INTO public.estimate_email_send_attempts
    (estimate_id, template, attempt, request_id, status)
  VALUES
    (_estimate_id, _template, 1, v_req_id, 'pending')
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.notify_email_on_new_estimate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $fn$
BEGIN
  PERFORM public.send_estimate_email_attempt(NEW.id, 'estimate-internal', 'support@autobais.app');
  IF NEW.email IS NOT NULL AND length(trim(NEW.email)) > 0 THEN
    PERFORM public.send_estimate_email_attempt(NEW.id, 'estimate-confirmation', NEW.email);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notify_telegram_new_estimate ON public.estimate_requests;
CREATE TRIGGER trg_notify_telegram_new_estimate
  AFTER INSERT ON public.estimate_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_on_new_estimate();

DROP TRIGGER IF EXISTS trg_notify_email_new_estimate ON public.estimate_requests;
CREATE TRIGGER trg_notify_email_new_estimate
  AFTER INSERT ON public.estimate_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_email_on_new_estimate();