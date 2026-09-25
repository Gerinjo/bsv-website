-- One verification message/link may cover both choices; subscriptions stay independent.
create table public.newsletter_confirmation_batches (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  mail_mode text not null check (mail_mode in ('test','live')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  topics text[] not null check (cardinality(topics) between 1 and 2 and topics <@ array['newsletter','club_info']::text[]),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  confirmed_at timestamptz
);
create index newsletter_confirmation_batches_email_idx on public.newsletter_confirmation_batches(email,mail_mode,created_at);
create table public.newsletter_confirmation_items (
  batch_id uuid not null references public.newsletter_confirmation_batches(id) on delete cascade,
  subscription_id uuid not null references public.newsletter_subscriptions(id) on delete cascade,
  token_hash text not null,
  primary key(batch_id,subscription_id)
);
create index newsletter_confirmation_items_subscription_idx on public.newsletter_confirmation_items(subscription_id);
alter table public.newsletter_jobs add column confirmation_batch_id uuid references public.newsletter_confirmation_batches(id) on delete cascade;
create index newsletter_jobs_confirmation_batch_idx on public.newsletter_jobs(confirmation_batch_id) where confirmation_batch_id is not null;
alter table public.newsletter_confirmation_batches enable row level security;
alter table public.newsletter_confirmation_items enable row level security;
revoke all on public.newsletter_confirmation_batches,public.newsletter_confirmation_items from public,anon,authenticated;
grant select,insert,update,delete on public.newsletter_confirmation_batches,public.newsletter_confirmation_items to service_role;

create function public.newsletter_request_membership_topics(
  p_email text,p_mode text,p_token_hash text,p_message jsonb,p_consent_version text,p_application_number text,p_topics text[]
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  sub public.newsletter_subscriptions; batch public.newsletter_confirmation_batches;
  topic_name text; selected_topics text[]; pending_topics text[] := '{}';
  sub_ids uuid[] := '{}'; primary_id uuid; new_hash text; job_id uuid;
begin
  if p_application_number is null or p_application_number !~ '^BSV-[0-9]{8}-[0-9]{6}-[A-F0-9]{4}$'
    or p_mode is null or p_mode not in ('live','test') or p_email is null
    or p_email <> lower(trim(p_email)) or length(p_email) not between 5 and 254
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_topics is null or cardinality(p_topics) not between 1 and 2
    or not p_topics <@ array['newsletter','club_info']::text[] or array_position(p_topics,null) is not null then
    raise exception 'invalid_membership_email_request';
  end if;
  select array_agg(distinct t order by t) into selected_topics from unnest(p_topics) t;
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_email,0));
  -- Replays cannot opt a person back in, even if a retry changes its choices.
  if exists(select 1 from public.newsletter_membership_requests r join public.newsletter_subscriptions s on s.id=r.subscription_id
    where r.application_number=p_application_number and s.email=p_email and s.mail_mode=p_mode) then
    return jsonb_build_object('status','already_requested');
  end if;
  foreach topic_name in array selected_topics loop
    select * into sub from public.newsletter_subscriptions where email=p_email and mail_mode=p_mode and topic=topic_name for update;
    if found and sub.status='confirmed' then
      sub_ids := array_append(sub_ids,sub.id);
    else
      pending_topics := array_append(pending_topics,topic_name);
    end if;
  end loop;
  if cardinality(pending_topics)=0 then
    insert into public.newsletter_membership_requests(subscription_id,application_number) select unnest(sub_ids),p_application_number;
    return jsonb_build_object('status','already_confirmed');
  end if;
  -- A current verification for exactly these choices can also serve a new application.
  select b.* into batch from public.newsletter_confirmation_batches b
    where b.email=p_email and b.mail_mode=p_mode and b.topics=pending_topics and b.confirmed_at is null and b.expires_at>now()
      and (select count(*) from public.newsletter_confirmation_items i join public.newsletter_subscriptions s on s.id=i.subscription_id
        where i.batch_id=b.id and s.confirmation_token_hash=i.token_hash and not s.token_consumed)=cardinality(b.topics)
      and exists(select 1 from public.newsletter_jobs j where j.confirmation_batch_id=b.id and j.kind='confirmation' and j.status in ('pending','processing','sent'))
    order by b.created_at desc limit 1;
  if found then
    insert into public.newsletter_membership_requests(subscription_id,application_number)
      select subscription_id,p_application_number from public.newsletter_confirmation_items where batch_id=batch.id
      union select unnest(sub_ids),p_application_number;
    return jsonb_build_object('status','pending');
  end if;
  -- Never replace a token while its mail is being handed to the provider.
  if exists(select 1 from public.newsletter_jobs j join public.newsletter_subscriptions s on s.id=j.subscription_id
      where s.email=p_email and s.mail_mode=p_mode and j.status='processing')
    or (select count(*) from public.newsletter_confirmation_batches where email=p_email and mail_mode=p_mode and created_at>now()-interval '1 day')>=5 then
    return jsonb_build_object('status','unavailable');
  end if;
  insert into public.newsletter_confirmation_batches(email,mail_mode,token_hash,topics)
    values(p_email,p_mode,p_token_hash,pending_topics) returning * into batch;
  foreach topic_name in array pending_topics loop
    -- These independent hashes bind the batch to this precise request generation.
    new_hash := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
    insert into public.newsletter_subscriptions(email,mail_mode,topic,consent_version,confirmation_token_hash)
      values(p_email,p_mode,topic_name,p_consent_version,new_hash)
      on conflict(email,mail_mode,topic) do update set confirmation_token_hash=new_hash,
        confirmation_expires_at=now()+interval '48 hours',token_consumed=false,requested_at=now(),consent_version=p_consent_version
      returning * into sub;
    -- Superseded overlapping requests cannot activate a different selection later.
    update public.newsletter_jobs j set status='cancelled',message=null
      where j.kind='confirmation' and j.status='pending' and
        (j.subscription_id=sub.id or j.confirmation_batch_id in (select i.batch_id from public.newsletter_confirmation_items i where i.subscription_id=sub.id));
    insert into public.newsletter_confirmation_items(batch_id,subscription_id,token_hash) values(batch.id,sub.id,new_hash);
    sub_ids := array_append(sub_ids,sub.id);
    primary_id := coalesce(primary_id,sub.id);
  end loop;
  insert into public.newsletter_membership_requests(subscription_id,application_number) select unnest(sub_ids),p_application_number;
  insert into public.newsletter_jobs(subscription_id,kind,message,confirmation_batch_id)
    values(primary_id,'confirmation',p_message,batch.id) returning id into job_id;
  return jsonb_build_object('status','queued','job_id',job_id);
end;
$$;

create function public.newsletter_confirm_batch(p_token_hash text,p_mode text,p_unsubscribe_hashes jsonb,p_message jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare batch public.newsletter_confirmation_batches; item record; primary_id uuid; job_id uuid;
begin
  select * into batch from public.newsletter_confirmation_batches where token_hash=p_token_hash and mail_mode=p_mode;
  if not found then return jsonb_build_object('status','invalid'); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || batch.email,0));
  select * into batch from public.newsletter_confirmation_batches where id=batch.id for update;
  perform s.id from public.newsletter_subscriptions s join public.newsletter_confirmation_items i on i.subscription_id=s.id
    where i.batch_id=batch.id order by s.id for update of s;
  if (select count(*) from public.newsletter_confirmation_items i join public.newsletter_subscriptions s on s.id=i.subscription_id
      where i.batch_id=batch.id and s.confirmation_token_hash=i.token_hash and s.email=batch.email and s.mail_mode=p_mode)=cardinality(batch.topics)
    and batch.confirmed_at is not null
    and not exists(select 1 from public.newsletter_confirmation_items i join public.newsletter_subscriptions s on s.id=i.subscription_id where i.batch_id=batch.id and s.status<>'confirmed') then
    return jsonb_build_object('status','already_confirmed','topics',batch.topics);
  end if;
  if batch.confirmed_at is not null then return jsonb_build_object('status','invalid'); end if;
  if batch.expires_at<=now() then return jsonb_build_object('status','expired'); end if;
  if (select count(*) from public.newsletter_confirmation_items i join public.newsletter_subscriptions s on s.id=i.subscription_id
      where i.batch_id=batch.id and s.confirmation_token_hash=i.token_hash and not s.token_consumed and s.email=batch.email and s.mail_mode=p_mode)=cardinality(batch.topics) then
    for item in select s.* from public.newsletter_subscriptions s join public.newsletter_confirmation_items i on i.subscription_id=s.id where i.batch_id=batch.id loop
      if coalesce(p_unsubscribe_hashes->>item.topic,'') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_unsubscribe_hash'; end if;
      update public.newsletter_subscriptions set status='confirmed',confirmed_at=now(),confirmed_consent_version=consent_version,
        token_consumed=true,unsubscribe_token_hash=p_unsubscribe_hashes->>item.topic,unsubscribed_at=null where id=item.id;
      update public.newsletter_jobs set status='cancelled',message=null where subscription_id=item.id and kind in ('confirmation','welcome') and status='pending';
      primary_id := coalesce(primary_id,item.id);
    end loop;
    update public.newsletter_confirmation_batches set confirmed_at=now() where id=batch.id;
    insert into public.newsletter_jobs(subscription_id,kind,message,confirmation_batch_id)
      values(primary_id,'welcome',p_message,batch.id) returning id into job_id;
    return jsonb_build_object('status','confirmed','topics',batch.topics,'job_id',job_id);
  end if;
  return jsonb_build_object('status','invalid');
end;
$$;

-- A combined job and individual unsubscribe jobs must serialize for the entire address.
create or replace function public.newsletter_claim_job(p_mode text,p_job_id uuid default null)
returns setof public.newsletter_jobs language plpgsql security invoker set search_path='' as $$
declare candidate record; selected_job uuid;
begin
  for candidate in select distinct s.email from public.newsletter_subscriptions s join public.newsletter_jobs j on j.subscription_id=s.id
    where s.mail_mode=p_mode and (p_job_id is null or j.id=p_job_id) and j.status in ('pending','processing') and j.available_at<=now()
  loop
    if not pg_try_advisory_xact_lock(hashtextextended(p_mode || ':' || candidate.email,0)) then continue; end if;
    if exists(select 1 from public.newsletter_jobs j join public.newsletter_subscriptions s on s.id=j.subscription_id
      where s.email=candidate.email and s.mail_mode=p_mode and j.status='processing' and j.locked_until>now()) then continue; end if;
    select j.id into selected_job from public.newsletter_jobs j join public.newsletter_subscriptions s on s.id=j.subscription_id
      where s.email=candidate.email and s.mail_mode=p_mode and j.status in ('pending','processing')
      order by j.created_at,j.id limit 1 for update of j;
    return query update public.newsletter_jobs set status='processing',locked_until=now()+interval '3 minutes',lease_id=gen_random_uuid(),
      attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()) where id=selected_job and available_at<=now() returning *;
    if found then return; end if;
  end loop;
end;
$$;

revoke all on function public.newsletter_request_membership_topics(text,text,text,jsonb,text,text,text[]),public.newsletter_confirm_batch(text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.newsletter_request_membership_topics(text,text,text,jsonb,text,text,text[]),public.newsletter_confirm_batch(text,text,jsonb,jsonb) to service_role;

create or replace function public.newsletter_unsubscribe(p_token_hash text, p_mode text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid;
begin
  select * into sub from public.newsletter_subscriptions where unsubscribe_token_hash = p_token_hash and mail_mode = p_mode for update;
  if not found then return jsonb_build_object('topic', sub.topic, 'status', 'invalid'); end if;
  if sub.status = 'unsubscribed' then return jsonb_build_object('topic', sub.topic, 'status', 'unsubscribed'); end if;
  update public.newsletter_subscriptions set status = 'unsubscribed', unsubscribed_at = now(), token_consumed = true where id = sub.id;
  update public.newsletter_jobs set status = 'cancelled', message = null
    where subscription_id = sub.id and status = 'pending' and (kind = 'confirmation' or (kind = 'welcome' and confirmation_batch_id is null));
  insert into public.newsletter_jobs(subscription_id, kind) values(sub.id, 'unsubscribe') returning id into job_id;
  return jsonb_build_object('topic', sub.topic, 'status', 'unsubscribed', 'job_id', job_id);
end;
$$;


create or replace function public.newsletter_cleanup()
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.newsletter_confirmation_batches where confirmed_at is null and created_at < now() - interval '7 days';
  delete from public.newsletter_rate_limits where started_at < now() - interval '1 day';
  delete from public.newsletter_subscriptions where status = 'pending' and requested_at < now() - interval '7 days';
  -- Remove bearer links from exhausted jobs, keeping the operational status.
  update public.newsletter_jobs set status = 'failed', message = null, last_error = 'retry_window_expired'
    where status in ('pending', 'processing') and first_attempt_at < now() - interval '23 hours'
      and (locked_until is null or locked_until < now());
end;
$$;

create or replace function public.newsletter_request_topic(p_email text, p_mode text, p_token_hash text, p_message jsonb, p_consent_version text, p_rate_key text, p_topic text)
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
    if exists(select 1 from public.newsletter_jobs j join public.newsletter_subscriptions s on s.id=j.subscription_id where s.email=p_email and s.mail_mode=p_mode and j.status='processing') then return null; end if;
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

