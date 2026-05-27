DROP FUNCTION IF EXISTS public.get_estimate_status(text, text);

CREATE OR REPLACE FUNCTION public.get_estimate_status(_code text, _phone_last4 text)
 RETURNS TABLE(public_code text, status text, service_type text, service_direction text, preferred_date date, preferred_time text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    er.created_at
  FROM public.estimate_requests er
  WHERE er.public_code = norm_code
    AND right(regexp_replace(er.phone, '\D', '', 'g'), 4) = norm_last4
  LIMIT 1;
END;
$function$;