ALTER TABLE public.tracking_auth_attempts
  DROP CONSTRAINT IF EXISTS tracking_auth_attempts_kind_check;

ALTER TABLE public.tracking_auth_attempts
  ADD CONSTRAINT tracking_auth_attempts_kind_check
  CHECK (kind IN ('code', 'token', 'portal'));