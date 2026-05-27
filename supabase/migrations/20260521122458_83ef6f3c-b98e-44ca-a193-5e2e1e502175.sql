ALTER TABLE public.mapbox_rate_hits DROP CONSTRAINT IF EXISTS mapbox_rate_hits_scope_check;
ALTER TABLE public.mapbox_rate_hits ADD CONSTRAINT mapbox_rate_hits_scope_check
  CHECK (scope = ANY (ARRAY['geocode','route','checkout_burst','checkout_hourly','chat']));