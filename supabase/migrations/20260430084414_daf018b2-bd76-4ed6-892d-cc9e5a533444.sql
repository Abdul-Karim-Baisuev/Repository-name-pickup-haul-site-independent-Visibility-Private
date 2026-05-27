-- 1. Extend estimate_requests with optional contact info
ALTER TABLE public.estimate_requests
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS name  text;

-- Drop old insert policy and re-create with email/name validation
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
  AND service_type = ANY (ARRAY['Moving','Junk Removal','Construction','Transport Only'])
  AND distance_miles > 0
  AND distance_miles <= 500
  AND status = 'new'
  AND service_direction = ANY (ARRAY['pickup','dropoff','both'])
  AND jsonb_typeof(stops) = 'array'
  AND jsonb_array_length(stops) <= 6
  AND item_quantity >= 1
  AND item_quantity <= 999
  AND (item_weight_lbs IS NULL OR (item_weight_lbs >= 0 AND item_weight_lbs <= 100000))
  AND (item_dimensions IS NULL OR char_length(item_dimensions) <= 120)
  AND (preferred_time IS NULL OR char_length(preferred_time) <= 40)
  AND (notes IS NULL OR char_length(notes) <= 500)
  AND (email IS NULL OR (char_length(email) <= 254 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
  AND (name  IS NULL OR (char_length(name)  >= 1 AND char_length(name) <= 80))
);

-- 2. Create booking_requests
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  name         text NOT NULL,
  email        text NOT NULL,
  phone        text NOT NULL,
  service_type text NOT NULL,
  preferred_date date,
  preferred_time text,
  address      text,
  description  text NOT NULL,
  status       text NOT NULL DEFAULT 'new'
);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view booking requests"
ON public.booking_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Visitors can submit valid booking requests"
ON public.booking_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name  IS NOT NULL AND char_length(name)  BETWEEN 1 AND 80
  AND email IS NOT NULL AND char_length(email) <= 254
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND phone IS NOT NULL AND phone ~ '^\+?[0-9][0-9\s().-]{6,24}[0-9]$'
  AND service_type = ANY (ARRAY[
    'Assembly & Install','Furniture Delivery','Moving','Junk Removal',
    'Construction','Transport Only','Other'
  ])
  AND description IS NOT NULL AND char_length(description) BETWEEN 5 AND 1000
  AND (address IS NULL OR char_length(address) <= 200)
  AND (preferred_time IS NULL OR char_length(preferred_time) <= 40)
  AND status = 'new'
);