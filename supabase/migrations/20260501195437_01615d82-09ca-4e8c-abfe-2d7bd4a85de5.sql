
CREATE OR REPLACE FUNCTION public.claim_driver_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN FALSE;
  END IF;
  IF NOT public.has_role(uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'driver'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_driver_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_driver_role() TO authenticated;
