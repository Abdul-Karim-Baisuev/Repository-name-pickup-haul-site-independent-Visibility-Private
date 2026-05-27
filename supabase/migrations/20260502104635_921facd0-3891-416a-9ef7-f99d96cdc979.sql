CREATE OR REPLACE FUNCTION public.send_booking_email_attempt(_booking_id uuid, _attempt integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  v_url     text := 'https://ijalhgtxtenktmjipyxw.supabase.co/functions/v1/send-transactional-email';
  v_anon    text := 'REDACTED_LEGACY_ANON_JWT_2026_05_10';
  v_service text;
  v_row     public.booking_requests%ROWTYPE;
  v_req_id  bigint;
  v_attempt_id uuid;
BEGIN
  SELECT * INTO v_row FROM public.booking_requests WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- The edge function rejects anything other than a service-role JWT to
  -- prevent abuse of the verified sender domain via the public anon key.
  BEGIN
    SELECT decrypted_secret INTO v_service
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_jwt'
      LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service := NULL;
  END;

  IF v_service IS NULL THEN
    INSERT INTO public.booking_email_send_attempts
      (booking_id, attempt, request_id, status, last_error)
    VALUES
      (_booking_id, _attempt, NULL, 'failed',
       'Missing vault secret service_role_jwt; email not sent')
    RETURNING id INTO v_attempt_id;
    RETURN v_attempt_id;
  END IF;

  v_req_id := net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service,
      'apikey', v_anon
    ),
    body := jsonb_build_object(
      'templateName',   'booking-internal',
      'recipientEmail', 'contact@autobais.com',
      'idempotencyKey', 'booking-internal-' || v_row.id::text,
      'templateData', jsonb_build_object(
        'name',          v_row.name,
        'email',         v_row.email,
        'phone',         v_row.phone,
        'serviceType',   v_row.service_type,
        'preferredDate', v_row.preferred_date,
        'preferredTime', v_row.preferred_time,
        'address',       v_row.address,
        'description',   v_row.description,
        'bookingId',     v_row.id::text
      )
    ),
    timeout_milliseconds := 10000
  );

  INSERT INTO public.booking_email_send_attempts
    (booking_id, attempt, request_id, status)
  VALUES
    (_booking_id, _attempt, v_req_id, 'pending')
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$function$;