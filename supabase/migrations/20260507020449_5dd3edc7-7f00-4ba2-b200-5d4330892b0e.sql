CREATE OR REPLACE FUNCTION public.submit_estimate_request(
  _address text,
  _phone text,
  _name text,
  _email text,
  _service_type text,
  _distance_miles numeric,
  _service_direction text,
  _stops jsonb,
  _preferred_date date,
  _preferred_time text,
  _item_weight_lbs numeric,
  _item_dimensions text,
  _item_quantity integer,
  _notes text
)
RETURNS TABLE(id uuid, public_code text, tracking_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_row public.estimate_requests%ROWTYPE;
BEGIN
  IF NOT (
    _address IS NOT NULL
    AND char_length(_address) >= 5
    AND char_length(_address) <= 160
    AND _phone IS NOT NULL
    AND _phone ~ '^\+?[0-9][0-9\s().-]{6,24}[0-9]$'
    AND _service_type = ANY (ARRAY[
      'Furniture & Appliance Delivery',
      'Store / Marketplace Pickup',
      'Small Move / Single Item',
      'Cabinet Delivery & Installation',
      'Assembly & Setup',
      'Materials / Equipment Delivery'
    ])
    AND _distance_miles > 0
    AND _distance_miles <= 500
    AND _service_direction = ANY (ARRAY['pickup','dropoff','both'])
    AND jsonb_typeof(_stops) = 'array'
    AND jsonb_array_length(_stops) <= 6
    AND _item_quantity >= 1
    AND _item_quantity <= 999
    AND (_item_weight_lbs IS NULL OR (_item_weight_lbs >= 0 AND _item_weight_lbs <= 100000))
    AND (_item_dimensions IS NULL OR char_length(_item_dimensions) <= 120)
    AND (_preferred_time IS NULL OR char_length(_preferred_time) <= 40)
    AND (_notes IS NULL OR char_length(_notes) <= 500)
    AND (_email IS NULL OR (char_length(_email) <= 254 AND _email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
    AND (_name IS NULL OR (char_length(_name) >= 1 AND char_length(_name) <= 80))
  ) THEN
    RAISE EXCEPTION 'invalid_estimate_request' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.estimate_requests (
    address,
    phone,
    name,
    email,
    service_type,
    distance_miles,
    service_direction,
    stops,
    preferred_date,
    preferred_time,
    item_weight_lbs,
    item_dimensions,
    item_quantity,
    notes
  ) VALUES (
    _address,
    _phone,
    NULLIF(_name, ''),
    NULLIF(_email, ''),
    _service_type,
    _distance_miles,
    _service_direction,
    _stops,
    _preferred_date,
    NULLIF(_preferred_time, ''),
    _item_weight_lbs,
    NULLIF(_item_dimensions, ''),
    _item_quantity,
    NULLIF(_notes, '')
  )
  RETURNING * INTO v_row;

  id := v_row.id;
  public_code := v_row.public_code;
  tracking_token := v_row.tracking_token;
  RETURN NEXT;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_estimate_request(text, text, text, text, text, numeric, text, jsonb, date, text, numeric, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_estimate_request(text, text, text, text, text, numeric, text, jsonb, date, text, numeric, text, integer, text) TO anon, authenticated;