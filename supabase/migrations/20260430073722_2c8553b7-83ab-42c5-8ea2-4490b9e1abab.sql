create table public.telegram_send_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  chat_id text,
  estimate_request_id uuid,
  status text not null check (status in ('success','error')),
  message_id bigint,
  error text,
  http_status int
);

create index idx_telegram_send_logs_created_at on public.telegram_send_logs (created_at desc);

alter table public.telegram_send_logs enable row level security;

create policy "Admins can view telegram send logs"
on public.telegram_send_logs
for select
to authenticated
using (has_role(auth.uid(), 'admin'::app_role));