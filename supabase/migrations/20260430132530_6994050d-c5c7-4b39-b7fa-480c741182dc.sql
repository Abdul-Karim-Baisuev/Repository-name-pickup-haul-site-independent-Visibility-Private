-- 1. Add admin_notes column to both request tables
ALTER TABLE public.estimate_requests
  ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- 2. Constrain status to a known set of values via CHECK constraint
ALTER TABLE public.estimate_requests
  DROP CONSTRAINT IF EXISTS estimate_requests_status_check;
ALTER TABLE public.estimate_requests
  ADD CONSTRAINT estimate_requests_status_check
  CHECK (status IN ('new','in_progress','done','canceled'));

ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_check;
ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_status_check
  CHECK (status IN ('new','in_progress','done','canceled'));

-- 3. Allow admins to UPDATE status / admin_notes on both tables
DROP POLICY IF EXISTS "Admins can update estimate requests" ON public.estimate_requests;
CREATE POLICY "Admins can update estimate requests"
  ON public.estimate_requests
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND status IN ('new','in_progress','done','canceled')
  );

DROP POLICY IF EXISTS "Admins can update booking requests" ON public.booking_requests;
CREATE POLICY "Admins can update booking requests"
  ON public.booking_requests
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND status IN ('new','in_progress','done','canceled')
  );

-- 4. Allow admins to view booking requests (already exists, ensure it does)
-- (existing policy "Admins can view booking requests" already covers this)

-- 5. Indexes for fast filtering in the admin panel
CREATE INDEX IF NOT EXISTS idx_estimate_requests_status ON public.estimate_requests (status);
CREATE INDEX IF NOT EXISTS idx_estimate_requests_created_at ON public.estimate_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests (status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_created_at ON public.booking_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_requests_service_type ON public.booking_requests (service_type);