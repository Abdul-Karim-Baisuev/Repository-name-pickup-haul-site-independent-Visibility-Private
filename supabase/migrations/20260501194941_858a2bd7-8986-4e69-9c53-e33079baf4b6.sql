
-- Таблица назначений
CREATE TABLE public.driver_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_request_id UUID NOT NULL REFERENCES public.estimate_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL,
  stage TEXT NOT NULL DEFAULT 'assigned'
    CHECK (stage IN ('assigned','en_route_pickup','arrived_pickup','loaded','in_transit','arrived_dropoff','completed','canceled')),
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_assignments_driver ON public.driver_assignments(driver_id, stage);
CREATE INDEX idx_driver_assignments_request ON public.driver_assignments(estimate_request_id);
CREATE UNIQUE INDEX idx_driver_assignments_active_per_request
  ON public.driver_assignments(estimate_request_id)
  WHERE stage NOT IN ('completed','canceled');

ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all assignments"
  ON public.driver_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers view own assignments"
  ON public.driver_assignments FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid() AND public.has_role(auth.uid(), 'driver'::app_role));

CREATE POLICY "Drivers update own assignments stage"
  ON public.driver_assignments FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid() AND public.has_role(auth.uid(), 'driver'::app_role))
  WITH CHECK (driver_id = auth.uid() AND public.has_role(auth.uid(), 'driver'::app_role));

CREATE TRIGGER trg_driver_assignments_updated
  BEFORE UPDATE ON public.driver_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Таблица координат
CREATE TABLE public.driver_locations (
  id BIGSERIAL PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.driver_assignments(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  heading DOUBLE PRECISION,
  speed_mph DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_locations_assignment_time
  ON public.driver_locations(assignment_id, recorded_at DESC);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all locations"
  ON public.driver_locations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers view own locations"
  ON public.driver_locations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.driver_assignments a
    WHERE a.id = driver_locations.assignment_id
      AND a.driver_id = auth.uid()
  ));

CREATE POLICY "Drivers insert own locations"
  ON public.driver_locations FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.driver_assignments a
    WHERE a.id = driver_locations.assignment_id
      AND a.driver_id = auth.uid()
      AND public.has_role(auth.uid(), 'driver'::app_role)
      AND a.stage NOT IN ('completed','canceled')
  ));

-- Публичная функция трекинга для клиента
CREATE OR REPLACE FUNCTION public.get_tracking_for_code(_code text, _phone_last4 text)
RETURNS TABLE(
  public_code text,
  stage text,
  service_type text,
  service_direction text,
  stops jsonb,
  address text,
  lat double precision,
  lng double precision,
  heading double precision,
  speed_mph double precision,
  recorded_at timestamptz,
  started_at timestamptz,
  is_live boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm_code  text;
  norm_last4 text;
  v_request  public.estimate_requests%ROWTYPE;
  v_assign   public.driver_assignments%ROWTYPE;
  v_loc      public.driver_locations%ROWTYPE;
BEGIN
  norm_code  := upper(trim(coalesce(_code, '')));
  norm_last4 := regexp_replace(coalesce(_phone_last4, ''), '\D', '', 'g');

  IF length(norm_code) < 6 OR length(norm_last4) <> 4 THEN
    RETURN;
  END IF;

  SELECT * INTO v_request
  FROM public.estimate_requests er
  WHERE er.public_code = norm_code
    AND right(regexp_replace(er.phone, '\D', '', 'g'), 4) = norm_last4
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_assign
  FROM public.driver_assignments da
  WHERE da.estimate_request_id = v_request.id
    AND da.stage NOT IN ('canceled')
  ORDER BY da.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      v_request.public_code,
      'unassigned'::text,
      v_request.service_type,
      v_request.service_direction,
      v_request.stops,
      v_request.address,
      NULL::double precision, NULL::double precision,
      NULL::double precision, NULL::double precision,
      NULL::timestamptz, NULL::timestamptz,
      false;
    RETURN;
  END IF;

  IF v_assign.stage IN ('en_route_pickup','arrived_pickup','loaded','in_transit','arrived_dropoff') THEN
    SELECT * INTO v_loc
    FROM public.driver_locations dl
    WHERE dl.assignment_id = v_assign.id
    ORDER BY dl.recorded_at DESC
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT
    v_request.public_code,
    v_assign.stage,
    v_request.service_type,
    v_request.service_direction,
    v_request.stops,
    v_request.address,
    v_loc.lat,
    v_loc.lng,
    v_loc.heading,
    v_loc.speed_mph,
    v_loc.recorded_at,
    v_assign.started_at,
    (v_loc.recorded_at IS NOT NULL AND v_loc.recorded_at > now() - interval '5 minutes');
END;
$$;

REVOKE ALL ON FUNCTION public.get_tracking_for_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tracking_for_code(text, text) TO anon, authenticated;

-- Realtime
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;
ALTER TABLE public.driver_assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_assignments;
