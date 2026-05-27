-- Helper: ensure caller is admin
CREATE OR REPLACE FUNCTION public.set_aikido_credentials(_client_id text, _client_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Aikido client id
  IF _client_id IS NOT NULL AND length(_client_id) > 0 THEN
    IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'aikido_client_id') THEN
      PERFORM vault.update_secret(
        (SELECT id FROM vault.secrets WHERE name = 'aikido_client_id'),
        _client_id,
        'aikido_client_id'
      );
    ELSE
      PERFORM vault.create_secret(_client_id, 'aikido_client_id', 'Aikido API client id');
    END IF;
  END IF;

  -- Aikido client secret
  IF _client_secret IS NOT NULL AND length(_client_secret) > 0 THEN
    IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'aikido_client_secret') THEN
      PERFORM vault.update_secret(
        (SELECT id FROM vault.secrets WHERE name = 'aikido_client_secret'),
        _client_secret,
        'aikido_client_secret'
      );
    ELSE
      PERFORM vault.create_secret(_client_secret, 'aikido_client_secret', 'Aikido API client secret');
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_aikido_credentials(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_aikido_credentials(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_aikido_credentials_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cid text;
  v_has_secret boolean;
  v_preview text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT decrypted_secret INTO v_cid
    FROM vault.decrypted_secrets
    WHERE name = 'aikido_client_id'
    LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'aikido_client_secret'
  ) INTO v_has_secret;

  IF v_cid IS NULL OR length(v_cid) = 0 THEN
    v_preview := NULL;
  ELSIF length(v_cid) <= 4 THEN
    v_preview := repeat('•', length(v_cid));
  ELSE
    v_preview := repeat('•', length(v_cid) - 4) || right(v_cid, 4);
  END IF;

  RETURN jsonb_build_object(
    'client_id_set', v_cid IS NOT NULL AND length(v_cid) > 0,
    'client_id_preview', v_preview,
    'client_secret_set', v_has_secret
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_aikido_credentials_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_aikido_credentials_status() TO authenticated;