-- =============================================================================
-- Tracking table for booking-email delivery attempts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.booking_email_send_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  attempt      int  NOT NULL DEFAULT 1,
  request_id   bigint,                          -- pg_net request id
  status       text NOT NULL DEFAULT 'pending', -- pending|sent|failed|retry_scheduled
  http_status  int,
  last_error   text,
  next_retry_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_email_attempts_pending
  ON public.booking_email_send_attempts (status, next_retry_at)
  WHERE status IN ('pending','retry_scheduled');

CREATE INDEX IF NOT EXISTS idx_booking_email_attempts_booking
  ON public.booking_email_send_attempts (booking_id);

ALTER TABLE public.booking_email_send_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view booking email attempts"
  ON public.booking_email_send_attempts;
CREATE POLICY "Admins can view booking email attempts"
  ON public.booking_email_send_attempts
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================================================
-- Helper: enqueue an http_post and log the attempt
-- =============================================================================
CREATE OR REPLACE FUNCTION public.send_booking_email_attempt(
  _booking_id uuid,
  _attempt    int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url    text := 'https://ijalhgtxtenktmjipyxw.supabase.co/functions/v1/send-transactional-email';
  v_anon   text := 'REDACTED_LEGACY_ANON_JWT_2026_05_10';
  v_row    public.booking_requests%ROWTYPE;
  v_req_id bigint;
  v_attempt_id uuid;
BEGIN
  SELECT * INTO v_row FROM public.booking_requests WHERE id = _booking_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_req_id := net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
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
$$;

REVOKE EXECUTE ON FUNCTION public.send_booking_email_attempt(uuid, int)
  FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- Replace the simple trigger with one that logs the first attempt
-- =============================================================================
CREATE OR REPLACE FUNCTION public.notify_email_on_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.send_booking_email_attempt(NEW.id, 1);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the booking insert if logging/HTTP fails
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_email_on_new_booking()
  FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- Reconciler: check pending requests and retry transient failures
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reconcile_booking_email_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_max_attempts constant int := 5;
  r record;
  v_status int;
  v_err    text;
  v_is_transient boolean;
  v_next_attempt int;
  v_backoff_minutes int;
BEGIN
  -- 1. Resolve pending requests by joining with net._http_response
  FOR r IN
    SELECT a.id, a.booking_id, a.attempt, a.request_id, resp.status_code, resp.error_msg
    FROM public.booking_email_send_attempts a
    LEFT JOIN net._http_response resp ON resp.id = a.request_id
    WHERE a.status = 'pending'
      AND a.request_id IS NOT NULL
      AND resp.id IS NOT NULL
  LOOP
    v_status := r.status_code;
    v_err    := r.error_msg;

    IF v_status BETWEEN 200 AND 299 THEN
      UPDATE public.booking_email_send_attempts
      SET status = 'sent',
          http_status = v_status,
          updated_at = now()
      WHERE id = r.id;

    ELSE
      -- Transient: network error (no status_code) OR 5xx OR 408/429
      v_is_transient :=
        (v_status IS NULL)
        OR (v_status >= 500 AND v_status <= 599)
        OR v_status IN (408, 429);

      IF v_is_transient AND r.attempt < v_max_attempts THEN
        v_next_attempt := r.attempt + 1;
        -- Exponential backoff: 1, 2, 4, 8, 16 minutes
        v_backoff_minutes := power(2, r.attempt - 1)::int;

        UPDATE public.booking_email_send_attempts
        SET status = 'retry_scheduled',
            http_status = v_status,
            last_error = COALESCE(v_err, 'HTTP ' || COALESCE(v_status::text, 'no response')),
            next_retry_at = now() + (v_backoff_minutes || ' minutes')::interval,
            updated_at = now()
        WHERE id = r.id;
      ELSE
        UPDATE public.booking_email_send_attempts
        SET status = 'failed',
            http_status = v_status,
            last_error = COALESCE(v_err, 'HTTP ' || COALESCE(v_status::text, 'no response')),
            updated_at = now()
        WHERE id = r.id;
      END IF;
    END IF;
  END LOOP;

  -- 2. Also time out very old "pending" rows (no response after 5 minutes)
  FOR r IN
    SELECT id, booking_id, attempt
    FROM public.booking_email_send_attempts
    WHERE status = 'pending'
      AND created_at < now() - interval '5 minutes'
  LOOP
    IF r.attempt < v_max_attempts THEN
      v_backoff_minutes := power(2, r.attempt - 1)::int;
      UPDATE public.booking_email_send_attempts
      SET status = 'retry_scheduled',
          last_error = 'No response within 5 minutes (timeout)',
          next_retry_at = now() + (v_backoff_minutes || ' minutes')::interval,
          updated_at = now()
      WHERE id = r.id;
    ELSE
      UPDATE public.booking_email_send_attempts
      SET status = 'failed',
          last_error = 'No response within 5 minutes (timeout)',
          updated_at = now()
      WHERE id = r.id;
    END IF;
  END LOOP;

  -- 3. Fire off scheduled retries that are now due
  FOR r IN
    SELECT id, booking_id, attempt
    FROM public.booking_email_send_attempts
    WHERE status = 'retry_scheduled'
      AND next_retry_at <= now()
    ORDER BY next_retry_at
    LIMIT 50
  LOOP
    -- Mark this row as resolved-by-retry so it isn't re-fired
    UPDATE public.booking_email_send_attempts
    SET status = 'failed',
        updated_at = now()
    WHERE id = r.id;

    -- Create a fresh attempt
    PERFORM public.send_booking_email_attempt(r.booking_id, r.attempt + 1);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_booking_email_attempts()
  FROM PUBLIC, anon, authenticated;
