create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_id text,
  event_type text,
  signature_verified boolean not null,
  outcome text not null,
  http_status integer not null,
  error_message text,
  estimate_request_id uuid,
  payload_summary jsonb
);

create index if not exists stripe_webhook_events_received_idx
  on public.stripe_webhook_events (received_at desc);
create index if not exists stripe_webhook_events_event_id_idx
  on public.stripe_webhook_events (event_id);

alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Admins can view stripe webhook events" on public.stripe_webhook_events;
create policy "Admins can view stripe webhook events"
on public.stripe_webhook_events
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role));
