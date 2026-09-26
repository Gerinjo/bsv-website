-- Operational mail only: no browser access to recipients, payloads or worker credentials.
create table public.football_alert_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  worker_secret_sha256 text not null check (worker_secret_sha256 ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);

create table public.football_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_key text not null check (event_key ~ '^[0-9a-f]{64}$'),
  mail_mode text not null check (mail_mode in ('test', 'live')),
  kind text not null check (kind in ('training_conflict', 'missing_referee')),
  match_id text not null,
  team_key text not null,
  match_date date not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed', 'needs_review')),
  message jsonb not null,
  first_attempt_at timestamptz not null default now(),
  locked_until timestamptz not null default (now() + interval '5 minutes'),
  lease_id uuid not null default gen_random_uuid(),
  attempts integer not null default 1,
  provider_id text,
  last_error text,
  completed_at timestamptz,
  unique (event_key, mail_mode)
);
create index football_alert_deliveries_match_date_idx on public.football_alert_deliveries (match_date);

create table public.football_alert_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  dry_run boolean not null,
  mail_mode text not null,
  status text not null default 'running' check (status in ('running', 'ok', 'partial', 'failed')),
  summary jsonb
);
create index football_alert_runs_started_at_idx on public.football_alert_runs (started_at desc);

alter table public.football_alert_settings enable row level security;
alter table public.football_alert_deliveries enable row level security;
alter table public.football_alert_runs enable row level security;
create policy football_alert_settings_deny_browser on public.football_alert_settings for all to anon, authenticated using (false) with check (false);
create policy football_alert_deliveries_deny_browser on public.football_alert_deliveries for all to anon, authenticated using (false) with check (false);
create policy football_alert_runs_deny_browser on public.football_alert_runs for all to anon, authenticated using (false) with check (false);
revoke all on public.football_alert_settings, public.football_alert_deliveries, public.football_alert_runs from public, anon, authenticated;
grant select on public.football_alert_settings to service_role;
grant select, insert, update on public.football_alert_deliveries, public.football_alert_runs to service_role;

-- The unique key and conditional UPDATE are one atomic claim across concurrent workers.
-- Freeze the original message on retries to keep the provider idempotency payload identical.
create function public.claim_football_alert(
  p_event_key text, p_mail_mode text, p_kind text, p_match_id text,
  p_team_key text, p_match_date date, p_message jsonb
) returns setof public.football_alert_deliveries
language plpgsql security invoker set search_path = '' as $$
begin
  update public.football_alert_deliveries
  set status = 'needs_review', last_error = 'retry_window_exhausted'
  where event_key = p_event_key and mail_mode = p_mail_mode
    and status in ('sending', 'failed') and locked_until <= now()
    and (first_attempt_at <= now() - interval '23 hours' or attempts >= 8);

  return query
  insert into public.football_alert_deliveries (event_key, mail_mode, kind, match_id, team_key, match_date, message)
  values (p_event_key, p_mail_mode, p_kind, p_match_id, p_team_key, p_match_date, p_message)
  on conflict (event_key, mail_mode) do update
  set status = 'sending', lease_id = gen_random_uuid(), locked_until = now() + interval '5 minutes',
    attempts = public.football_alert_deliveries.attempts + 1, last_error = null
  where public.football_alert_deliveries.status in ('sending', 'failed')
    and public.football_alert_deliveries.locked_until <= now()
    and public.football_alert_deliveries.first_attempt_at > now() - interval '23 hours'
    and public.football_alert_deliveries.attempts < 8
  returning *;
end;
$$;
revoke all on function public.claim_football_alert(text, text, text, text, text, date, jsonb) from public, anon, authenticated;
grant execute on function public.claim_football_alert(text, text, text, text, text, date, jsonb) to service_role;
