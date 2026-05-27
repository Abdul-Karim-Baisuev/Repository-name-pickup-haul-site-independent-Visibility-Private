
-- Status change audit log for booking_requests and estimate_requests
CREATE TABLE IF NOT EXISTS public.order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type text NOT NULL CHECK (order_type IN ('booking','estimate')),
  order_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_email text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_logs_order
  ON public.order_status_logs (order_type, order_id, changed_at DESC);

ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view status change logs
CREATE POLICY "Admins can view order status logs"
  ON public.order_status_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No client INSERT/UPDATE/DELETE — only the SECURITY DEFINER trigger writes here

-- Trigger function: log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_email text;
BEGIN
  IF TG_TABLE_NAME = 'booking_requests' THEN
    v_type := 'booking';
  ELSIF TG_TABLE_NAME = 'estimate_requests' THEN
    v_type := 'estimate';
  ELSE
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    BEGIN
      SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_email := NULL;
    END;

    INSERT INTO public.order_status_logs
      (order_type, order_id, old_status, new_status, changed_by, changed_by_email)
    VALUES
      (v_type, NEW.id, OLD.status, NEW.status, auth.uid(), v_email);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_status_booking ON public.booking_requests;
CREATE TRIGGER trg_log_status_booking
  AFTER UPDATE OF status ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

DROP TRIGGER IF EXISTS trg_log_status_estimate ON public.estimate_requests;
CREATE TRIGGER trg_log_status_estimate
  AFTER UPDATE OF status ON public.estimate_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();
