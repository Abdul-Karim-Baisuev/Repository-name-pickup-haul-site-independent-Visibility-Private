DROP POLICY IF EXISTS "Drivers view own locations" ON public.driver_locations;

CREATE POLICY "Drivers view own locations"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.driver_assignments a
    WHERE a.id = driver_locations.assignment_id
      AND a.driver_id = auth.uid()
  )
);