
-- Brute-force protection for public tracking/status lookups
CREATE TABLE IF NOT EXISTS public.tracking_auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  key_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('token', 'code')),
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_auth_attempts_lookup
  ON public.tracking_auth_attempts (key_hash, attempted_at DESC);

ALTER TABLE public.tracking_auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view tracking auth attempts"
  ON public.tracking_auth_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Updated: get_tracking_by_token with rate-limit
CREATE OR REPLACE FUNCTION public.get_tracking_by_token(_token text, _phone_last4 text)
 RETURNS TABLE(stage text, service_type text, service_direction text, dest_area text, driver_first_name text, vehicle_label text, lat double precision, lng double precision, heading double precision, speed_mph double precision, recorded_at timestamp with time zone, started_at timestamp with time zone, is_live boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  norm_token text;
  norm_last4 text;
  v_request  public.estimate_requests%ROWTYPE;
  v_assign   public.driver_assignments%ROWTYPE;
  v_loc      public.driver_locations%ROWTYPE;
  v_first    text;
  v_dest     text;
  v_key_hash text;
  v_fail_count int;
  v_found boolean := false;
BEGIN
  norm_token := trim(coalesce(_token, ''));
  norm_last4 := regexp_replace(coalesce(_phone_last4, ''), '\D', '', 'g');

  IF length(norm_token) < 20 OR length(norm_last4) <> 4 THEN
    RETURN;
  END IF;

  v_key_hash := encode(extensions.digest(norm_token, 'sha256'), 'hex');

  SELECT count(*) INTO v_fail_count
  FROM public.tracking_auth_attempts
  WHERE key_hash = v_key_hash
    AND kind = 'token'
    AND success = false
    AND attempted_at > now() - interval '10 minutes';

  IF v_fail_count >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.estimate_requests er
  WHERE er.tracking_token = norm_token
    AND right(regexp_replace(er.phone, '\D', '', 'g'), 4) = norm_last4
  LIMIT 1;

  v_found := FOUND;

  INSERT INTO public.tracking_auth_attempts (key_hash, kind, success)
  VALUES (v_key_hash, 'token', v_found);

  IF NOT v_found THEN
    RETURN;
  END IF;

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

  SELECT split_part(coalesce(p.display_name, ''), ' ', 1)
    INTO v_first
  FROM public.profiles p
  WHERE p.user_id = v_assign.driver_id
  LIMIT 1;

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
$function$;

-- Updated: get_estimate_status with rate-limit
CREATE OR REPLACE FUNCTION public.get_estimate_status(_code text, _phone_last4 text)
 RETURNS TABLE(public_code text, status text, service_type text, service_direction text, preferred_date date, preferred_time text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  norm_code TEXT;
  norm_last4 TEXT;
  v_key_hash TEXT;
  v_fail_count int;
  v_found boolean := false;
  v_row record;
BEGIN
  norm_code  := upper(trim(coalesce(_code, '')));
  norm_last4 := regexp_replace(coalesce(_phone_last4, ''), '\D', '', 'g');

  IF length(norm_code) < 6 OR length(norm_last4) <> 4 THEN
    RETURN;
  END IF;

  v_key_hash := encode(extensions.digest(norm_code, 'sha256'), 'hex');

  SELECT count(*) INTO v_fail_count
  FROM public.tracking_auth_attempts
  WHERE key_hash = v_key_hash
    AND kind = 'code'
    AND success = false
    AND attempted_at > now() - interval '10 minutes';

  IF v_fail_count >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = '22023';
  END IF;

  SELECT er.public_code, er.status, er.service_type, er.service_direction,
         er.preferred_date, er.preferred_time, er.created_at
    INTO v_row
  FROM public.estimate_requests er
  WHERE er.public_code = norm_code
    AND right(regexp_replace(er.phone, '\D', '', 'g'), 4) = norm_last4
  LIMIT 1;

  v_found := FOUND;

  INSERT INTO public.tracking_auth_attempts (key_hash, kind, success)
  VALUES (v_key_hash, 'code', v_found);

  IF v_found THEN
    public_code := v_row.public_code;
    status := v_row.status;
    service_type := v_row.service_type;
    service_direction := v_row.service_direction;
    preferred_date := v_row.preferred_date;
    preferred_time := v_row.preferred_time;
    created_at := v_row.created_at;
    RETURN NEXT;
  END IF;
END;
$function$;
