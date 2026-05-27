CREATE TABLE IF NOT EXISTS public.booking_email_reconcile_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at          timestamptz NOT NULL DEFAULT now(),
  finished_at         timestamptz,
  duration_ms         int,
  resolved_count      int NOT NULL DEFAULT 0,
  sent_count          int NOT NULL DEFAULT 0,
  retry_scheduled     int NOT NULL DEFAULT 0,
  failed_count        int NOT NULL DEFAULT 0,
  timed_out_count     int NOT NULL DEFAULT 0,
  retried_count       int NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'success',
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_email_reconcile_logs_started
  ON public.booking_email_reconcile_logs (started_at DESC);

ALTER TABLE public.booking_email_reconcile_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view reconciler logs"
  ON public.booking_email_reconcile_logs;
CREATE POLICY "Admins can view reconciler logs"
  ON public.booking_email_reconcile_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP FUNCTION IF EXISTS public.reconcile_booking_email_attempts();

CREATE FUNCTION public.reconcile_booking_email_attempts()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_max_attempts constant int := 5;
  v_log_id uuid;
  v_started timestamptz := clock_timestamp();
  v_resolved int := 0;
  v_sent int := 0;
  v_retry_scheduled int := 0;
  v_failed int := 0;
  v_timed_out int := 0;
  v_retried int := 0;
  r record;
  v_status int;
  v_err text;
  v_is_transient boolean;
  v_backoff_minutes int;
BEGIN
  INSERT INTO public.booking_email_reconcile_logs (started_at)
  VALUES (v_started)
  RETURNING id INTO v_log_id;

  FOR r IN
    SELECT a.id, a.booking_id, a.attempt, a.request_id, resp.status_code, resp.error_msg
    FROM public.booking_email_send_attempts a
    LEFT JOIN net._http_response resp ON resp.id = a.request_id
    WHERE a.status = 'pending'
      AND a.request_id IS NOT NULL
      AND resp.id IS NOT NULL
  LOOP
    v_resolved := v_resolved + 1;
    v_status := r.status_code;
    v_err    := r.error_msg;

    IF v_status BETWEEN 200 AND 299 THEN
      UPDATE public.booking_email_send_attempts
      SET status = 'sent', http_status = v_status, updated_at = now()
      WHERE id = r.id;
      v_sent := v_sent + 1;
    ELSE
      v_is_transient :=
        (v_status IS NULL)
        OR (v_status >= 500 AND v_status <= 599)
        OR v_status IN (408, 429);

      IF v_is_transient AND r.attempt < v_max_attempts THEN
        v_backoff_minutes := power(2, r.attempt - 1)::int;
        UPDATE public.booking_email_send_attempts
        SET status = 'retry_scheduled',
            http_status = v_status,
            last_error = COALESCE(v_err, 'HTTP ' || COALESCE(v_status::text, 'no response')),
            next_retry_at = now() + (v_backoff_minutes || ' minutes')::interval,
            updated_at = now()
        WHERE id = r.id;
        v_retry_scheduled := v_retry_scheduled + 1;
      ELSE
        UPDATE public.booking_email_send_attempts
        SET status = 'failed',
            http_status = v_status,
            last_error = COALESCE(v_err, 'HTTP ' || COALESCE(v_status::text, 'no response')),
            updated_at = now()
        WHERE id = r.id;
        v_failed := v_failed + 1;
      END IF;
    END IF;
  END LOOP;

  FOR r IN
    SELECT id, booking_id, attempt
    FROM public.booking_email_send_attempts
    WHERE status = 'pending'
      AND created_at < now() - interval '5 minutes'
  LOOP
    v_timed_out := v_timed_out + 1;
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

  FOR r IN
    SELECT id, booking_id, attempt
    FROM public.booking_email_send_attempts
    WHERE status = 'retry_scheduled'
      AND next_retry_at <= now()
    ORDER BY next_retry_at
    LIMIT 50
  LOOP
    UPDATE public.booking_email_send_attempts
    SET status = 'failed', updated_at = now()
    WHERE id = r.id;

    PERFORM public.send_booking_email_attempt(r.booking_id, r.attempt + 1);
    v_retried := v_retried + 1;
  END LOOP;

  UPDATE public.booking_email_reconcile_logs
  SET finished_at     = clock_timestamp(),
      duration_ms     = (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int,
      resolved_count  = v_resolved,
      sent_count      = v_sent,
      retry_scheduled = v_retry_scheduled,
      failed_count    = v_failed,
      timed_out_count = v_timed_out,
      retried_count   = v_retried,
      status          = 'success'
  WHERE id = v_log_id;

  RETURN v_log_id;

EXCEPTION WHEN OTHERS THEN
  UPDATE public.booking_email_reconcile_logs
  SET finished_at  = clock_timestamp(),
      duration_ms  = (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int,
      status       = 'error',
      error_message = SQLERRM
  WHERE id = v_log_id;
  RETURN v_log_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_booking_email_attempts()
  FROM PUBLIC, anon, authenticated;