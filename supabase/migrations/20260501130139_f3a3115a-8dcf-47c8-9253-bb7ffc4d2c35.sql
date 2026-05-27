ALTER TABLE public.estimate_requests
  ALTER COLUMN public_code SET DEFAULT public.generate_estimate_code();