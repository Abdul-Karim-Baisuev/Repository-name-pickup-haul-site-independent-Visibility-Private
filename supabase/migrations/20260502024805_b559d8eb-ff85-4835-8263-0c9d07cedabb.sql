-- 1) Harden claim_admin_if_none(): only allow when there are zero users at all
--    (true first-install bootstrap). After the first user exists, this function
--    can no longer be used to self-grant admin.
CREATE OR REPLACE FUNCTION public.claim_admin_if_none()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID := auth.uid();
  user_count INT;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If any admin already exists, just report whether caller is one.
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN public.has_role(current_user_id, 'admin');
  END IF;

  -- No admin yet: only allow bootstrap when the auth.users table has exactly
  -- one user (the very first signup). This prevents any authenticated user
  -- from elevating themselves to admin if all admins are later deleted.
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count <> 1 THEN
    RAISE EXCEPTION 'admin bootstrap is not available'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN TRUE;
END;
$function$;

-- 2) Restrict Realtime channel subscriptions for driver tracking.
--    realtime.messages controls who can subscribe / send on a topic.
--    We allow only admins and drivers to subscribe to the
--    'driver-tracking-*' channels used by the admin tracking UI.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and drivers can read realtime broadcasts"
  ON realtime.messages;
CREATE POLICY "Admins and drivers can read realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'driver'::public.app_role)
);

DROP POLICY IF EXISTS "Admins and drivers can write realtime broadcasts"
  ON realtime.messages;
CREATE POLICY "Admins and drivers can write realtime broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'driver'::public.app_role)
);
