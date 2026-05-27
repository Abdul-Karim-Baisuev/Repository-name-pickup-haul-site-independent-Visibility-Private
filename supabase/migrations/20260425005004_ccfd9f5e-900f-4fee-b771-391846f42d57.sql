-- Add new fields to estimate_requests for richer pricing inputs
ALTER TABLE public.estimate_requests
  ADD COLUMN IF NOT EXISTS service_direction text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_date date,
  ADD COLUMN IF NOT EXISTS preferred_time text,
  ADD COLUMN IF NOT EXISTS item_weight_lbs numeric,
  ADD COLUMN IF NOT EXISTS item_dimensions text,
  ADD COLUMN IF NOT EXISTS item_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes text;

-- Replace insert policy to validate the new fields
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
  AND service_direction = ANY (ARRAY['pickup'::text, 'dropoff'::text, 'both'::text])
  AND jsonb_typeof(stops) = 'array'
  AND jsonb_array_length(stops) <= 6
  AND item_quantity >= 1
  AND item_quantity <= 999
  AND (item_weight_lbs IS NULL OR (item_weight_lbs >= 0 AND item_weight_lbs <= 100000))
  AND (item_dimensions IS NULL OR char_length(item_dimensions) <= 120)
  AND (preferred_time IS NULL OR char_length(preferred_time) <= 40)
  AND (notes IS NULL OR char_length(notes) <= 500)
);