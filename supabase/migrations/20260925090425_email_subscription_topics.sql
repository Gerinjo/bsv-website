-- Each mailing list has independent consent, tokens and unsubscribe state.
-- Existing registrations remain newsletter subscriptions.
alter table public.newsletter_subscriptions
  add column topic text not null default 'newsletter' check (topic in ('newsletter', 'club_info'));
alter table public.newsletter_subscriptions
  drop constraint newsletter_subscriptions_email_mail_mode_key,
  add constraint newsletter_subscriptions_email_mode_topic_key unique(email, mail_mode, topic);

create function public.newsletter_request_topic(p_email text, p_mode text, p_token_hash text, p_message jsonb, p_consent_version text, p_rate_key text, p_topic text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid; rate_hits integer;
begin
  if p_topic is null or p_topic not in ('newsletter', 'club_info') then raise exception 'invalid_subscription_topic'; end if;
  insert into public.newsletter_rate_limits as r (key) values (p_rate_key)
    on conflict (key) do update set
      hits = case when r.started_at < now() - interval '1 hour' then 1 else r.hits + 1 end,
      started_at = case when r.started_at < now() - interval '1 hour' then now() else r.started_at end
    returning hits into rate_hits;
  if rate_hits > 10 then return null; end if;
  -- Serialize concurrent requests, including the first insert for an address.
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_email, 0));
  select * into sub from public.newsletter_subscriptions where email = p_email and mail_mode = p_mode and topic = p_topic for update;
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
    insert into public.newsletter_subscriptions(email, mail_mode, consent_version, confirmation_token_hash, topic)
      values(p_email, p_mode, p_consent_version, p_token_hash, p_topic) returning * into sub;
  end if;
  insert into public.newsletter_jobs(subscription_id, kind, message) values(sub.id, 'confirmation', p_message) returning id into job_id;
  return job_id;
end;
$$;

-- Preserve the existing API for the homepage and membership integration.
create or replace function public.newsletter_request(p_email text, p_mode text, p_token_hash text, p_message jsonb, p_consent_version text, p_rate_key text)
returns uuid language sql security invoker set search_path = '' as $$
  select public.newsletter_request_topic(p_email, p_mode, p_token_hash, p_message, p_consent_version, p_rate_key, 'newsletter');
$$;
revoke all on function public.newsletter_request_topic(text,text,text,jsonb,text,text,text) from public, anon, authenticated;
grant execute on function public.newsletter_request_topic(text,text,text,jsonb,text,text,text) to service_role;

create or replace function public.newsletter_confirm(p_token_hash text, p_mode text, p_unsubscribe_hash text, p_message jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid;
begin
  select * into sub from public.newsletter_subscriptions where confirmation_token_hash = p_token_hash and mail_mode = p_mode for update;
  if not found then return jsonb_build_object('topic', sub.topic, 'status', 'invalid'); end if;
  if sub.token_consumed then
    return jsonb_build_object('topic', sub.topic, 'status', case when sub.status = 'confirmed' then 'already_confirmed' else 'invalid' end,
      'job_id', (select id from public.newsletter_jobs where subscription_id = sub.id and kind = 'welcome' order by created_at desc, id desc limit 1));
  end if;
  if sub.confirmation_expires_at <= now() then return jsonb_build_object('topic', sub.topic, 'status', 'expired'); end if;
  update public.newsletter_subscriptions set status = 'confirmed', confirmed_at = now(), confirmed_consent_version = consent_version, token_consumed = true,
    unsubscribe_token_hash = p_unsubscribe_hash, unsubscribed_at = null where id = sub.id;
  update public.newsletter_jobs set status = 'cancelled', message = null
    where subscription_id = sub.id and status = 'pending' and kind in ('confirmation', 'welcome');
  insert into public.newsletter_jobs(subscription_id, kind, message) values(sub.id, 'welcome', p_message) returning id into job_id;
  return jsonb_build_object('topic', sub.topic, 'status', 'confirmed', 'job_id', job_id);
end;
$$;

create or replace function public.newsletter_unsubscribe(p_token_hash text, p_mode text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid;
begin
  select * into sub from public.newsletter_subscriptions where unsubscribe_token_hash = p_token_hash and mail_mode = p_mode for update;
  if not found then return jsonb_build_object('topic', sub.topic, 'status', 'invalid'); end if;
  if sub.status = 'unsubscribed' then return jsonb_build_object('topic', sub.topic, 'status', 'unsubscribed'); end if;
  update public.newsletter_subscriptions set status = 'unsubscribed', unsubscribed_at = now(), token_consumed = true where id = sub.id;
  update public.newsletter_jobs set status = 'cancelled', message = null
    where subscription_id = sub.id and status = 'pending' and kind in ('confirmation', 'welcome');
  insert into public.newsletter_jobs(subscription_id, kind) values(sub.id, 'unsubscribe') returning id into job_id;
  return jsonb_build_object('topic', sub.topic, 'status', 'unsubscribed', 'job_id', job_id);
end;
$$;

create or replace function public.newsletter_request_membership(
  p_email text, p_mode text, p_token_hash text, p_message jsonb,
  p_consent_version text, p_application_number text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid; result_status text;
begin
  if p_application_number is null or p_application_number !~ '^BSV-[0-9]{8}-[0-9]{6}-[A-F0-9]{4}$' then
    raise exception 'invalid_membership_reference';
  end if;
  -- Use the same lock as homepage requests; keep all checks and enqueue atomic.
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_email, 0));
  select * into sub from public.newsletter_subscriptions where email = p_email and mail_mode = p_mode and topic = 'newsletter' for update;
  if found then
    if exists(select 1 from public.newsletter_membership_requests where subscription_id = sub.id and application_number = p_application_number) then
      return jsonb_build_object('status', 'already_requested');
    end if;
    if sub.status = 'confirmed' then
      result_status := 'already_confirmed';
    elsif not sub.token_consumed and sub.confirmation_expires_at > now()
       and exists(select 1 from public.newsletter_jobs where subscription_id = sub.id and kind = 'confirmation'
         and created_at >= sub.requested_at and status in ('pending', 'processing', 'sent')) then
      result_status := 'pending';
    end if;
  end if;
  -- PHP has already validated its own single-use captcha. Reuse the per-email
  -- cooldown and daily limit, without sharing one IP quota across all members.
  if result_status is null then
    job_id := public.newsletter_request(p_email, p_mode, p_token_hash, p_message, p_consent_version,
      'membership:' || p_mode || ':' || p_application_number);
    if job_id is null then return jsonb_build_object('status', 'unavailable'); end if;
    select * into sub from public.newsletter_subscriptions where email = p_email and mail_mode = p_mode and topic = 'newsletter';
    result_status := 'queued';
  end if;
  insert into public.newsletter_membership_requests(subscription_id, application_number) values(sub.id, p_application_number);
  return jsonb_build_object('status', result_status);
end;
$$;
revoke all on function public.newsletter_request_membership(text,text,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.newsletter_request_membership(text,text,text,jsonb,text,text) to service_role;

comment on table public.newsletter_subscriptions is 'Private Double-Opt-in-Nachweise für Newsletter und allgemeine Informations-E-Mails; je Thema getrennte Einwilligung und Abmeldung.';
comment on column public.newsletter_subscriptions.topic is 'newsletter: Vereinsnewsletter; club_info: organisatorische Vereinsinformationen ohne Newsletter.';
