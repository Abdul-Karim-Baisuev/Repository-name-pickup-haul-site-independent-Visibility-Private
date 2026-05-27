-- 1. Profiles: drop public-read policy, restrict to owner + admins
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Set fixed search_path on SECURITY DEFINER helpers that lacked it
ALTER FUNCTION public.enqueue_email(text, jsonb)        SET search_path = public, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, extensions;
ALTER FUNCTION public.delete_email(text, bigint)        SET search_path = public, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, extensions;

-- 3. Revoke public/anon/authenticated EXECUTE on internal SECURITY DEFINER functions.
--    These are only meant to be invoked by the service role (edge functions) or by
--    other database functions/triggers running as definer.
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb)              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint)               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_booking_email_attempt(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_booking_email_attempts()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_email_on_new_booking()             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_telegram_on_new_booking()          FROM PUBLIC, anon, authenticated;