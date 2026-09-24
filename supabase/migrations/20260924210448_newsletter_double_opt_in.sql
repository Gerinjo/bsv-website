-- Only the service-role Edge Function may read/write consent and delivery jobs.
create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(trim(email)) and length(email) between 5 and 254),
  mail_mode text not null check (mail_mode in ('test', 'live')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  consent_version text not null,
  requested_at timestamptz not null default now(),
  confirmation_token_hash text not null unique check (length(confirmation_token_hash) = 64),
  confirmation_expires_at timestamptz not null default (now() + interval '48 hours'),
  token_consumed boolean not null default false,
  confirmed_at timestamptz,
  confirmed_consent_version text,
  unsubscribe_token_hash text unique,
  unsubscribed_at timestamptz,
  unique (email, mail_mode),
  check (status <> 'confirmed' or confirmed_at is not null)
);

create table public.newsletter_jobs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.newsletter_subscriptions(id) on delete cascade,
  kind text not null check (kind in ('confirmation', 'welcome', 'unsubscribe')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'cancelled', 'failed')),
  message jsonb,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  locked_until timestamptz,
  lease_id uuid,
  attempts integer not null default 0,
  provider_synced boolean not null default false,
  provider_id text,
  last_error text,
  completed_at timestamptz
);
create index newsletter_jobs_subscription_idx on public.newsletter_jobs(subscription_id, created_at);
create index newsletter_jobs_pending_idx on public.newsletter_jobs(available_at) where status in ('pending', 'processing');
create index newsletter_subscriptions_cleanup_idx on public.newsletter_subscriptions(requested_at) where status = 'pending';

create table public.newsletter_rate_limits (
  key text primary key,
  started_at timestamptz not null default now(),
  hits integer not null default 1
);

alter table public.newsletter_subscriptions enable row level security;
alter table public.newsletter_jobs enable row level security;
alter table public.newsletter_rate_limits enable row level security;
revoke all on public.newsletter_subscriptions, public.newsletter_jobs, public.newsletter_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.newsletter_subscriptions, public.newsletter_jobs, public.newsletter_rate_limits to service_role;
create policy newsletter_subscriptions_private on public.newsletter_subscriptions for all to anon, authenticated using (false) with check (false);
create policy newsletter_jobs_private on public.newsletter_jobs for all to anon, authenticated using (false) with check (false);
create policy newsletter_rate_limits_private on public.newsletter_rate_limits for all to anon, authenticated using (false) with check (false);

-- Each caller's IP is HMAC-hashed by the server; no plain IP is stored.
create function public.newsletter_request(p_email text, p_mode text, p_token_hash text, p_message jsonb, p_consent_version text, p_rate_key text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid; rate_hits integer;
begin
  insert into public.newsletter_rate_limits as r (key) values (p_rate_key)
    on conflict (key) do update set
      hits = case when r.started_at < now() - interval '1 hour' then 1 else r.hits + 1 end,
      started_at = case when r.started_at < now() - interval '1 hour' then now() else r.started_at end
    returning hits into rate_hits;
  if rate_hits > 10 then return null; end if;
  -- Serialize concurrent requests, including the first insert for an address.
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_email, 0));
  select * into sub from public.newsletter_subscriptions where email = p_email and mail_mode = p_mode for update;
  if found then
    if sub.requested_at > now() - interval '5 minutes' then return null; end if;
    if (select count(*) from public.newsletter_jobs where subscription_id = sub.id and kind = 'confirmation' and created_at > now() - interval '1 day') >= 5 then return null; end if;
    -- Do not invalidate links while a message is being handed to the provider.
    if exists(select 1 from public.newsletter_jobs where subscription_id = sub.id and status = 'processing') then return null; end if;
    update public.newsletter_jobs set status = 'cancelled', message = null where subscription_id = sub.id and kind = 'confirmation' and status = 'pending';
    update public.newsletter_subscriptions set
      confirmation_token_hash = p_token_hash, confirmation_expires_at = now() + interval '48 hours',
      token_consumed = false, requested_at = now(), consent_version = p_consent_version
      where id = sub.id;
  else
    insert into public.newsletter_subscriptions(email, mail_mode, consent_version, confirmation_token_hash)
      values(p_email, p_mode, p_consent_version, p_token_hash) returning * into sub;
  end if;
  insert into public.newsletter_jobs(subscription_id, kind, message) values(sub.id, 'confirmation', p_message) returning id into job_id;
  return job_id;
end;
$$;

-- Consent and its follow-up notification are committed in the same transaction.
create function public.newsletter_confirm(p_token_hash text, p_mode text, p_unsubscribe_hash text, p_message jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid;
begin
  select * into sub from public.newsletter_subscriptions where confirmation_token_hash = p_token_hash and mail_mode = p_mode for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if sub.token_consumed then
    return jsonb_build_object('status', case when sub.status = 'confirmed' then 'already_confirmed' else 'invalid' end,
      'job_id', (select id from public.newsletter_jobs where subscription_id = sub.id and kind = 'welcome' order by created_at desc, id desc limit 1));
  end if;
  if sub.confirmation_expires_at <= now() then return jsonb_build_object('status', 'expired'); end if;
  update public.newsletter_subscriptions set status = 'confirmed', confirmed_at = now(), confirmed_consent_version = consent_version, token_consumed = true,
    unsubscribe_token_hash = p_unsubscribe_hash, unsubscribed_at = null where id = sub.id;
  update public.newsletter_jobs set status = 'cancelled', message = null
    where subscription_id = sub.id and status = 'pending' and kind in ('confirmation', 'welcome');
  insert into public.newsletter_jobs(subscription_id, kind, message) values(sub.id, 'welcome', p_message) returning id into job_id;
  return jsonb_build_object('status', 'confirmed', 'job_id', job_id);
end;
$$;

create function public.newsletter_unsubscribe(p_token_hash text, p_mode text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid;
begin
  select * into sub from public.newsletter_subscriptions where unsubscribe_token_hash = p_token_hash and mail_mode = p_mode for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if sub.status = 'unsubscribed' then return jsonb_build_object('status', 'unsubscribed'); end if;
  update public.newsletter_subscriptions set status = 'unsubscribed', unsubscribed_at = now(), token_consumed = true where id = sub.id;
  update public.newsletter_jobs set status = 'cancelled', message = null
    where subscription_id = sub.id and status = 'pending' and kind in ('confirmation', 'welcome');
  insert into public.newsletter_jobs(subscription_id, kind) values(sub.id, 'unsubscribe') returning id into job_id;
  return jsonb_build_object('status', 'unsubscribed', 'job_id', job_id);
end;
$$;

create function public.newsletter_claim_job(p_mode text, p_job_id uuid default null)
returns setof public.newsletter_jobs language plpgsql security invoker set search_path = '' as $$
declare sub_id uuid; job_id uuid;
begin
  -- One lease per subscriber serializes Resend changes and cancellation.
  select s.id into sub_id from public.newsletter_subscriptions s
    where s.mail_mode = p_mode
      and exists(select 1 from public.newsletter_jobs j where j.subscription_id = s.id
        and (p_job_id is null or j.id = p_job_id) and j.status in ('pending', 'processing') and j.available_at <= now())
      and (select j.available_at from public.newsletter_jobs j where j.subscription_id = s.id and j.status in ('pending', 'processing') order by j.created_at, j.id limit 1) <= now()
      and not exists(select 1 from public.newsletter_jobs j where j.subscription_id = s.id and j.status = 'processing' and j.locked_until > now())
    order by s.requested_at for update of s skip locked limit 1;
  if sub_id is null then return; end if;
  select id into job_id from public.newsletter_jobs where subscription_id = sub_id and status in ('pending', 'processing')
    order by created_at, id limit 1 for update;
  -- Always process in order, including retries. Never overtake an unsubscribe.
  return query update public.newsletter_jobs set status = 'processing', locked_until = now() + interval '3 minutes',
      lease_id = gen_random_uuid(), attempts = attempts + 1, first_attempt_at = coalesce(first_attempt_at, now())
    where id = job_id and available_at <= now() returning *;
end;
$$;

create function public.newsletter_cleanup()
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.newsletter_rate_limits where started_at < now() - interval '1 day';
  delete from public.newsletter_subscriptions where status = 'pending' and requested_at < now() - interval '7 days';
  -- Remove bearer links from exhausted jobs, keeping the operational status.
  update public.newsletter_jobs set status = 'failed', message = null, last_error = 'retry_window_expired'
    where status in ('pending', 'processing') and first_attempt_at < now() - interval '23 hours'
      and (locked_until is null or locked_until < now());
end;
$$;

revoke all on function public.newsletter_request(text,text,text,jsonb,text,text), public.newsletter_confirm(text,text,text,jsonb),
  public.newsletter_unsubscribe(text,text), public.newsletter_claim_job(text,uuid), public.newsletter_cleanup() from public, anon, authenticated;
grant execute on function public.newsletter_request(text,text,text,jsonb,text,text), public.newsletter_confirm(text,text,text,jsonb),
  public.newsletter_unsubscribe(text,text), public.newsletter_claim_job(text,uuid), public.newsletter_cleanup() to service_role;

comment on table public.newsletter_subscriptions is 'Nordstern Post: Double-Opt-in-Nachweis; Testdaten sind keine Newsletter-Empfänger. Resend-Abmeldungen bleiben für Broadcasts maßgeblich.';
comment on table public.newsletter_jobs is 'Privater Benachrichtigungsworkflow; Mailinhalt nur bis zum Versand, danach ohne Bestätigungs- oder Abmeldelinks.';
