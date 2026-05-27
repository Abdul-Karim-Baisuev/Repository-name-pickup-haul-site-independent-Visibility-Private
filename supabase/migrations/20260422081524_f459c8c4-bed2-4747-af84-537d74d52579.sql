CREATE TABLE public.estimate_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL CHECK (char_length(address) BETWEEN 5 AND 160),
  service_type TEXT NOT NULL CHECK (service_type IN ('Moving', 'Junk Removal', 'Construction', 'Transport Only')),
  distance_miles NUMERIC(7,2) NOT NULL CHECK (distance_miles > 0 AND distance_miles <= 500),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit estimate requests"
ON public.estimate_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE INDEX idx_estimate_requests_created_at ON public.estimate_requests (created_at DESC);
CREATE INDEX idx_estimate_requests_status ON public.estimate_requests (status);