-- ============================================================
-- 1. Tracking token on estimate_requests
-- ============================================================
ALTER TABLE public.estimate_requests
  ADD COLUMN IF NOT EXISTS tracking_token text;

-- Helper: generate URL-safe random token
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token text;
BEGIN
  -- 32 bytes of randomness -> base64 url-safe, ~43 chars
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'),
                       '+/=', '-_');
  RETURN v_token;
END;
$$;

-- Backfill existing rows
UPDATE public.estimate_requests
SET tracking_token = public.generate_tracking_token()
WHERE tracking_token IS NULL;

ALTER TABLE public.estimate_requests
  ALTER COLUMN tracking_token SET NOT NULL,
  ALTER COLUMN tracking_token SET DEFAULT public.generate_tracking_token();

CREATE UNIQUE INDEX IF NOT EXISTS estimate_requests_tracking_token_key
  ON public.estimate_requests (tracking_token);

-- ============================================================
-- 2. Vehicle label on driver_assignments (admin picks truck name)
-- ============================================================
ALTER TABLE public.driver_assignments
  ADD COLUMN IF NOT EXISTS vehicle_label text;

-- ============================================================
-- 3. New token-based public lookup RPC (minimal fields only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tracking_by_token(
  _token text,
  _phone_last4 text
)
RETURNS TABLE(
  stage text,
  service_type text,
  service_direction text,
  dest_area text,        -- masked: city/area only, e.g. "Van Nuys, CA"
  driver_first_name text,
  vehicle_label text,
  lat double precision,
  lng double precision,
  heading double precision,
  speed_mph double precision,
  recorded_at timestamptz,
  started_at timestamptz,
  is_live boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm_token text;
  norm_last4 text;
  v_request  public.estimate_requests%ROWTYPE;
  v_assign   public.driver_assignments%ROWTYPE;
  v_loc      public.driver_locations%ROWTYPE;
  v_first    text;
  v_dest     text;
BEGIN
  norm_token := trim(coalesce(_token, ''));
  norm_last4 := regexp_replace(coalesce(_phone_last4, ''), '\D', '', 'g');

  IF length(norm_token) < 20 OR length(norm_last4) <> 4 THEN
    RETURN;
  END IF;

  SELECT * INTO v_request
  FROM public.estimate_requests er
  WHERE er.tracking_token = norm_token
    AND right(regexp_replace(er.phone, '\D', '', 'g'), 4) = norm_last4
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Mask address: keep only the last two comma-separated segments
  -- (e.g. "1234 Main St, Van Nuys, CA 91405" -> "Van Nuys, CA 91405")
  v_dest := CASE
    WHEN v_request.address IS NULL THEN NULL
    WHEN array_length(string_to_array(v_request.address, ','), 1) >= 3
      THEN trim(both ' ' FROM (
        (string_to_array(v_request.address, ','))
          [array_length(string_to_array(v_request.address, ','), 1) - 1]
        || ',' ||
        (string_to_array(v_request.address, ','))
          [array_length(string_to_array(v_request.address, ','), 1)]
      ))
    ELSE v_request.address
  END;

  SELECT * INTO v_assign
  FROM public.driver_assignments da
  WHERE da.estimate_request_id = v_request.id
    AND da.stage NOT IN ('canceled')
  ORDER BY da.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'unassigned'::text,
      v_request.service_type,
      v_request.service_direction,
      v_dest,
      NULL::text, NULL::text,
      NULL::double precision, NULL::double precision,
      NULL::double precision, NULL::double precision,
      NULL::timestamptz, NULL::timestamptz,
      false;
    RETURN;
  END IF;

  -- Driver first name from profiles
  SELECT split_part(coalesce(p.display_name, ''), ' ', 1)
    INTO v_first
  FROM public.profiles p
  WHERE p.user_id = v_assign.driver_id
  LIMIT 1;

  -- Live location only while order is active
  IF v_assign.stage IN ('en_route_pickup','arrived_pickup','loaded','in_transit','arrived_dropoff') THEN
    SELECT * INTO v_loc
    FROM public.driver_locations dl
    WHERE dl.assignment_id = v_assign.id
    ORDER BY dl.recorded_at DESC
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT
    v_assign.stage,
    v_request.service_type,
    v_request.service_direction,
    v_dest,
    NULLIF(v_first, ''),
    v_assign.vehicle_label,
    v_loc.lat,
    v_loc.lng,
    v_loc.heading,
    v_loc.speed_mph,
    v_loc.recorded_at,
    v_assign.started_at,
    (v_loc.recorded_at IS NOT NULL
     AND v_loc.recorded_at > now() - interval '5 minutes'
     AND v_assign.stage NOT IN ('completed','canceled'));
END;
$$;

REVOKE ALL ON FUNCTION public.get_tracking_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tracking_by_token(text, text) TO anon, authenticated;

-- ============================================================
-- 4. Drop the old over-permissive RPC
-- ============================================================
DROP FUNCTION IF EXISTS public.get_tracking_for_code(text, text);

-- ============================================================
-- 5. Trim driver_locations history to last 50 per assignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.trim_driver_locations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.driver_locations
  WHERE assignment_id = NEW.assignment_id
    AND id NOT IN (
      SELECT id FROM public.driver_locations
      WHERE assignment_id = NEW.assignment_id
      ORDER BY recorded_at DESC
      LIMIT 50
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS driver_locations_trim ON public.driver_locations;
CREATE TRIGGER driver_locations_trim
  AFTER INSERT ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_driver_locations();

-- ============================================================
-- 6. Wipe locations when delivery ends (completed/canceled)
-- ============================================================
CREATE OR REPLACE FUNCTION public.purge_locations_on_delivery_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IN ('completed','canceled')
     AND (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    DELETE FROM public.driver_locations
    WHERE assignment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS driver_assignments_purge_locations ON public.driver_assignments;
CREATE TRIGGER driver_assignments_purge_locations
  AFTER UPDATE OF stage ON public.driver_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.purge_locations_on_delivery_end();

-- ============================================================
-- 7. Tighten driver_locations INSERT: block once delivery ended
--    (existing policy already blocks completed/canceled, keep it.)
-- ============================================================
-- No-op: confirms current policy `Drivers insert own locations`
-- already excludes completed/canceled stages.
