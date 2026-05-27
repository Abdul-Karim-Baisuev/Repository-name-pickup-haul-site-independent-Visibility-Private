DROP POLICY IF EXISTS "Anyone can submit estimate requests" ON public.estimate_requests;

CREATE POLICY "Visitors can submit valid estimate requests"
ON public.estimate_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  address IS NOT NULL
  AND char_length(address) BETWEEN 5 AND 160
  AND service_type IN ('Moving', 'Junk Removal', 'Construction', 'Transport Only')
  AND distance_miles > 0
  AND distance_miles <= 500
  AND status = 'new'
);