CREATE TABLE public.mapbox_rate_hits (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('geocode','route')),
  ip_hash TEXT NOT NULL,
  hit_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mapbox_rate_hits_lookup
  ON public.mapbox_rate_hits (scope, ip_hash, hit_at DESC);

ALTER TABLE public.mapbox_rate_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view mapbox rate hits"
  ON public.mapbox_rate_hits FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Atomic check-and-record function: returns true if request is allowed,
-- false if it would exceed the limit. Counts hits in the trailing window.
CREATE OR REPLACE FUNCTION public.check_mapbox_rate_limit(
  _scope TEXT,
  _ip_hash TEXT,
  _max INT,
  _window_seconds INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.mapbox_rate_hits
  WHERE scope = _scope
    AND ip_hash = _ip_hash
    AND hit_at > now() - make_interval(secs => _window_seconds);

  IF v_count >= _max THEN
    RETURN false;
  END IF;

  INSERT INTO public.mapbox_rate_hits (scope, ip_hash) VALUES (_scope, _ip_hash);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_mapbox_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_mapbox_rate_limit(TEXT, TEXT, INT, INT) TO service_role;

-- Cleanup function for old rows (call opportunistically from edge functions)
CREATE OR REPLACE FUNCTION public.cleanup_mapbox_rate_hits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.mapbox_rate_hits WHERE hit_at < now() - interval '1 hour';
$$;

REVOKE ALL ON FUNCTION public.cleanup_mapbox_rate_hits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_mapbox_rate_hits() TO service_role;