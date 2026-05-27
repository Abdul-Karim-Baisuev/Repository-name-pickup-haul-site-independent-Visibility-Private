ALTER TABLE public.estimate_requests
ADD COLUMN phone TEXT;

UPDATE public.estimate_requests
SET phone = ''
WHERE phone IS NULL;

ALTER TABLE public.estimate_requests
ALTER COLUMN phone SET NOT NULL;

ALTER TABLE public.estimate_requests
ADD CONSTRAINT estimate_requests_phone_format
CHECK (
  phone ~ '^\+?[0-9][0-9\s().-]{6,24}[0-9]$'
);

DROP POLICY IF EXISTS "Visitors can submit valid estimate requests" ON public.estimate_requests;

CREATE POLICY "Visitors can submit valid estimate requests"
ON public.estimate_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  address IS NOT NULL
  AND char_length(address) >= 5
  AND char_length(address) <= 160
  AND phone IS NOT NULL
  AND phone ~ '^\+?[0-9][0-9\s().-]{6,24}[0-9]$'
  AND service_type = ANY (ARRAY['Moving'::text, 'Junk Removal'::text, 'Construction'::text, 'Transport Only'::text])
  AND distance_miles > 0::numeric
  AND distance_miles <= 500::numeric
  AND status = 'new'::text
);