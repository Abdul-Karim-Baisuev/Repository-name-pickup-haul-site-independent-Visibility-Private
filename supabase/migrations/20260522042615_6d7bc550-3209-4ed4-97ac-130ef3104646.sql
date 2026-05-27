
-- Set per-message visibility timeout for backoff scheduling.
CREATE OR REPLACE FUNCTION public.set_email_message_vt(
  queue_name text,
  message_id bigint,
  vt_offset_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM pgmq.set_vt(queue_name, message_id, vt_offset_seconds);
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_email_message_vt(text, bigint, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_email_message_vt(text, bigint, integer) TO service_role;

-- Slow the dispatcher cron from every 5 seconds to every 30 seconds.
-- Backoff timing is controlled by per-message visibility timeout, so this
-- does not delay first-attempt delivery beyond one cron tick.
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue'),
  schedule := '30 seconds'
);
