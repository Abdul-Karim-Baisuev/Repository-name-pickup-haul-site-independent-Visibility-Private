DROP POLICY IF EXISTS "Visitors can submit valid estimate requests" ON public.estimate_requests;

CREATE POLICY "Visitors can submit valid estimate requests"
ON public.estimate_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (address IS NOT NULL)
  AND (char_length(address) >= 5)
  AND (char_length(address) <= 160)
  AND (phone IS NOT NULL)
  AND (phone ~ '^\+?[0-9][0-9\s().-]{6,24}[0-9]$'::text)
  AND (service_type = ANY (ARRAY[
    'Furniture & Appliance Delivery'::text,
    'Store / Marketplace Pickup'::text,
    'Small Move / Single Item'::text,
    'Cabinet Delivery & Installation'::text,
    'Assembly & Setup'::text,
    'Materials / Equipment Delivery'::text
  ]))
  AND (distance_miles > (0)::numeric)
  AND (distance_miles <= (500)::numeric)
  AND (status = 'new'::text)
  AND (service_direction = ANY (ARRAY['pickup'::text, 'dropoff'::text, 'both'::text]))
  AND (jsonb_typeof(stops) = 'array'::text)
  AND (jsonb_array_length(stops) <= 6)
  AND (item_quantity >= 1)
  AND (item_quantity <= 999)
  AND ((item_weight_lbs IS NULL) OR ((item_weight_lbs >= (0)::numeric) AND (item_weight_lbs <= (100000)::numeric)))
  AND ((item_dimensions IS NULL) OR (char_length(item_dimensions) <= 120))
  AND ((preferred_time IS NULL) OR (char_length(preferred_time) <= 40))
  AND ((notes IS NULL) OR (char_length(notes) <= 500))
  AND ((email IS NULL) OR ((char_length(email) <= 254) AND (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)))
  AND ((name IS NULL) OR ((char_length(name) >= 1) AND (char_length(name) <= 80)))
);