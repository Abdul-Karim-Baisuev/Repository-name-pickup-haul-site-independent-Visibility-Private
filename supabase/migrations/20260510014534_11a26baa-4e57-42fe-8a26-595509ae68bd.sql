CREATE OR REPLACE FUNCTION public._sync_service_role_jwt_vault(_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _value IS NULL OR length(_value) < 20 THEN
    RAISE EXCEPTION 'invalid value';
  END IF;
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'service_role_jwt';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(_value, 'service_role_jwt',
      'Service role key used by DB triggers to call protected edge functions');
  ELSE
    PERFORM vault.update_secret(v_id, _value, 'service_role_jwt',
      'Service role key used by DB triggers to call protected edge functions');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._sync_service_role_jwt_vault(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sync_service_role_jwt_vault(text) TO service_role;