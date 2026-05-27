-- Payment fields on estimate_requests (admin-controlled, server-side source of truth)
ALTER TABLE public.estimate_requests
  ADD COLUMN IF NOT EXISTS final_price_cents integer,
  ADD COLUMN IF NOT EXISTS deposit_amount_cents integer,
  ADD COLUMN IF NOT EXISTS balance_due_cents integer,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_token text,
  ADD COLUMN IF NOT EXISTS last_payment_link_type text,
  ADD COLUMN IF NOT EXISTS last_payment_link_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Validate payment_status via trigger (avoid CHECK that could fail later additions)
CREATE OR REPLACE FUNCTION public.validate_estimate_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status IS NULL OR NEW.payment_status NOT IN
      ('unpaid','deposit_pending','deposit_paid','full_pending','paid','balance_pending','refunded','failed') THEN
    RAISE EXCEPTION 'invalid payment_status: %', NEW.payment_status USING ERRCODE = '22023';
  END IF;
  IF NEW.last_payment_link_type IS NOT NULL
     AND NEW.last_payment_link_type NOT IN ('deposit','full','balance') THEN
    RAISE EXCEPTION 'invalid last_payment_link_type: %', NEW.last_payment_link_type USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_estimate_payment_status ON public.estimate_requests;
CREATE TRIGGER trg_validate_estimate_payment_status
BEFORE INSERT OR UPDATE OF payment_status, last_payment_link_type
ON public.estimate_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_estimate_payment_status();

-- Auto-generate a payment_token (separate from tracking_token, used in /pay/<token> URLs)
CREATE OR REPLACE FUNCTION public.set_estimate_payment_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.payment_token IS NULL OR NEW.payment_token = '' THEN
    NEW.payment_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_estimate_payment_token ON public.estimate_requests;
CREATE TRIGGER trg_set_estimate_payment_token
BEFORE INSERT ON public.estimate_requests
FOR EACH ROW EXECUTE FUNCTION public.set_estimate_payment_token();

-- Backfill existing rows
UPDATE public.estimate_requests
SET payment_token = translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_')
WHERE payment_token IS NULL;

ALTER TABLE public.estimate_requests
  ALTER COLUMN payment_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_estimate_requests_payment_token
  ON public.estimate_requests(payment_token);

CREATE INDEX IF NOT EXISTS idx_estimate_requests_stripe_session
  ON public.estimate_requests(stripe_checkout_session_id);
