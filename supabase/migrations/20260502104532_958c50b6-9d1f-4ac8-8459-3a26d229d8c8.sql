-- Helper: extract assignment id from realtime topic and check driver ownership.
-- Topic format used by the client: 'driver-tracking-{assignment_id}'
CREATE OR REPLACE FUNCTION public.is_own_active_driver_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prefix constant text := 'driver-tracking-';
  v_id_text text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR _topic IS NULL THEN
    RETURN FALSE;
  END IF;
  IF position(v_prefix in _topic) <> 1 THEN
    RETURN FALSE;
  END IF;
  v_id_text := substring(_topic from (length(v_prefix) + 1));
  BEGIN
    v_id := v_id_text::uuid;
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;
  RETURN EXISTS (
    SELECT 1
    FROM public.driver_assignments a
    WHERE a.id = v_id
      AND a.driver_id = v_uid
      AND a.stage NOT IN ('completed', 'canceled')
  );
END;
$$;

-- Replace overly broad driver/admin realtime policies with topic-scoped ones.
DROP POLICY IF EXISTS "Admins and drivers can read realtime broadcasts"  ON realtime.messages;
DROP POLICY IF EXISTS "Admins and drivers can write realtime broadcasts" ON realtime.messages;

CREATE POLICY "Admins can read all realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can write realtime broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Drivers read own active delivery channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'driver'::public.app_role)
  AND public.is_own_active_driver_topic(realtime.topic())
);

CREATE POLICY "Drivers write own active delivery channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'driver'::public.app_role)
  AND public.is_own_active_driver_topic(realtime.topic())
);