
-- Customer portal: secure RPC to look up own orders by email + last 4 of phone.
-- Returns only fields safe for the customer; never admin_notes, raw id, stripe ids,
-- or full phone. Rate-limited via tracking_auth_attempts (5 fails / 10 min per email).

CREATE OR REPLACE FUNCTION public.get_customer_orders(_email text, _phone_last4 text)
RETURNS TABLE (
  public_code text,
  tracking_token text,
  service_type text,
  service_direction text,
  preferred_date date,
  preferred_time text,
  destination_summary text,
  status text,
  payment_status text,
  final_price_cents integer,
  deposit_amount_cents integer,
  balance_due_cents integer,
  payable_token text,
  payable_link_type text,
  paid_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  norm_email text;
  norm_last4 text;
  v_key_hash text;
  v_fail_count int;
  v_found boolean := false;
BEGIN
  norm_email := lower(trim(coalesce(_email, '')));
  norm_last4 := regexp_replace(coalesce(_phone_last4, ''), '\D', '', 'g');

  IF length(norm_email) < 5 OR position('@' in norm_email) < 2 OR length(norm_last4) <> 4 THEN
    RETURN;
  END IF;

  v_key_hash := encode(extensions.digest(norm_email, 'sha256'), 'hex');

  SELECT count(*) INTO v_fail_count
  FROM public.tracking_auth_attempts
  WHERE key_hash = v_key_hash
    AND kind = 'portal'
    AND success = false
    AND attempted_at > now() - interval '10 minutes';

  IF v_fail_count >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.estimate_requests er
    WHERE lower(er.email) = norm_email
      AND right(regexp_replace(er.phone, '\D', '', 'g'), 4) = norm_last4
  ) INTO v_found;

  INSERT INTO public.tracking_auth_attempts (key_hash, kind, success)
  VALUES (v_key_hash, 'portal', v_found);

  IF NOT v_found THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    er.public_code,
    er.tracking_token,
    er.service_type,
    er.service_direction,
    er.preferred_date,
    er.preferred_time,
    CASE
      WHEN er.address IS NULL THEN NULL
      WHEN array_length(string_to_array(er.address, ','), 1) >= 3
        THEN trim(both ' ' FROM (
          (string_to_array(er.address, ','))
            [array_length(string_to_array(er.address, ','), 1) - 1]
          || ', ' ||
          (string_to_array(er.address, ','))
            [array_length(string_to_array(er.address, ','), 1)]
        ))
      ELSE er.address
    END AS destination_summary,
    er.status,
    er.payment_status,
    er.final_price_cents,
    er.deposit_amount_cents,
    er.balance_due_cents,
    -- Expose payment_token only when there is a payable amount and the
    -- order is not already fully paid. This lets the portal trigger the
    -- existing create-estimate-payment edge function safely.
    CASE
      WHEN er.payment_status = 'paid' THEN NULL
      WHEN er.payment_status IN ('balance_pending') AND COALESCE(er.balance_due_cents, 0) > 0 THEN er.payment_token
      WHEN COALESCE(er.deposit_amount_cents, 0) > 0
        OR COALESCE(er.final_price_cents, 0) > 0
        OR COALESCE(er.balance_due_cents, 0) > 0
        THEN er.payment_token
      ELSE NULL
    END AS payable_token,
    CASE
      WHEN er.payment_status = 'paid' THEN NULL
      WHEN COALESCE(er.balance_due_cents, 0) > 0
        AND er.payment_status IN ('deposit_paid','balance_pending')
        THEN 'balance'
      WHEN COALESCE(er.deposit_amount_cents, 0) > 0
        AND er.payment_status IN ('unpaid','deposit_pending')
        THEN 'deposit'
      WHEN COALESCE(er.final_price_cents, 0) > 0
        AND er.payment_status IN ('unpaid','full_pending')
        THEN 'full'
      ELSE NULL
    END AS payable_link_type,
    er.paid_at,
    er.created_at
  FROM public.estimate_requests er
  WHERE lower(er.email) = norm_email
    AND right(regexp_replace(er.phone, '\D', '', 'g'), 4) = norm_last4
  ORDER BY er.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_orders(text, text) TO anon, authenticated;
