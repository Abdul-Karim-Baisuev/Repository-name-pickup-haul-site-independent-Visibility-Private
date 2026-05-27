ALTER TABLE public.estimate_requests
  DROP CONSTRAINT IF EXISTS estimate_requests_service_type_check;

ALTER TABLE public.estimate_requests
  ADD CONSTRAINT estimate_requests_service_type_check
  CHECK (service_type IN (
    'Furniture & Appliance Delivery',
    'Store / Marketplace Pickup',
    'Small Move / Single Item',
    'Cabinet Delivery & Installation',
    'Assembly & Setup',
    'Materials / Equipment Delivery',
    'Moving',
    'Junk Removal',
    'Construction',
    'Transport Only'
  ));