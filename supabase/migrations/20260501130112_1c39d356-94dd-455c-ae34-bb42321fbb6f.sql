-- 1. Add a short, human-friendly public code to estimate_requests
ALTER TABLE public.estimate_requests
  ADD COLUMN IF NOT EXISTS public_code TEXT;

-- Generator: EST-XXXXXX using base32 (Crockford-ish, no confusing chars)
CREATE OR REPLACE FUNCTION public.generate_estimate_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  code text;
  attempts int := 0;
BEGIN
  LOOP
    code := 'EST-';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.estimate_requests WHERE public_code = code);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique estimate code';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-fill public_code on insert
CREATE OR REPLACE FUNCTION public.set_estimate_public_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_code IS NULL OR NEW.public_code = '' THEN
    NEW.public_code := public.generate_estimate_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS estimate_requests_set_public_code ON public.estimate_requests;
CREATE TRIGGER estimate_requests_set_public_code
  BEFORE INSERT ON public.estimate_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_estimate_public_code();

-- Backfill existing rows
UPDATE public.estimate_requests
SET public_code = public.generate_estimate_code()
WHERE public_code IS NULL;

ALTER TABLE public.estimate_requests
  ALTER COLUMN public_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS estimate_requests_public_code_key
  ON public.estimate_requests (public_code);

-- 2. Public RPC: look up status by code + last 4 digits of phone (anti-enumeration)
CREATE OR REPLACE FUNCTION public.get_estimate_status(_code TEXT, _phone_last4 TEXT)
RETURNS TABLE (
  public_code TEXT,
  status TEXT,
  service_type TEXT,
  service_direction TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  created_at TIMESTAMPTZ,
  admin_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  norm_code TEXT;
  norm_last4 TEXT;
BEGIN
  norm_code  := upper(trim(coalesce(_code, '')));
  norm_last4 := regexp_replace(coalesce(_phone_last4, ''), '\D', '', 'g');

  IF length(norm_code) < 6 OR length(norm_last4) <> 4 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    er.public_code,
    er.status,
    er.service_type,
    er.service_direction,
    er.preferred_date,
    er.preferred_time,
    er.created_at,
    er.admin_notes
  FROM public.estimate_requests er
  WHERE er.public_code = norm_code
    AND right(regexp_replace(er.phone, '\D', '', 'g'), 4) = norm_last4
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_estimate_status(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_estimate_status(TEXT, TEXT) TO anon, authenticated;