-- Public multi-choice signup uses the same atomic confirmation as membership signup.
-- Existing single-topic requests and links remain supported.
create function public.newsletter_request_topics(
  p_email text, p_mode text, p_token_hash text, p_message jsonb,
  p_consent_version text, p_rate_key text, p_topics text[]
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  selected_topics text[]; topic_name text; sub public.newsletter_subscriptions;
  batch_id uuid; primary_id uuid; new_hash text; job_id uuid; rate_hits integer;
begin
  if p_mode is null or p_mode not in ('live', 'test') or p_email is null
    or p_email <> lower(trim(p_email)) or length(p_email) not between 5 and 254
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_topics is null or cardinality(p_topics) not between 1 and 2
    or not p_topics <@ array['newsletter', 'club_info']::text[] or array_position(p_topics, null) is not null
    or p_consent_version is null or length(trim(p_consent_version)) = 0
    or p_rate_key is null or length(p_rate_key) = 0 or p_message is null then
    raise exception 'invalid_subscription_request';
  end if;
  select array_agg(distinct t order by t) into selected_topics from unnest(p_topics) t;
  if cardinality(selected_topics) <> cardinality(p_topics) then raise exception 'invalid_subscription_topic'; end if;
  if cardinality(selected_topics) = 1 then
    return public.newsletter_request_topic(p_email, p_mode, p_token_hash, p_message, p_consent_version, p_rate_key, selected_topics[1]);
  end if;

  -- Count the whole submission once, regardless of how many offers were selected.
  insert into public.newsletter_rate_limits as r (key) values (p_rate_key)
    on conflict (key) do update set
      hits = case when r.started_at < now() - interval '1 hour' then 1 else r.hits + 1 end,
      started_at = case when r.started_at < now() - interval '1 hour' then now() else r.started_at end
    returning hits into rate_hits;
  if rate_hits > 10 then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_email, 0));

  -- Check all limits before changing either subscription. A changed selection may
  -- replace a single-offer request immediately; repeated combined requests wait.
  if exists(select 1 from public.newsletter_confirmation_batches b
      where b.email = p_email and b.mail_mode = p_mode and b.topics = selected_topics
        and b.created_at > now() - interval '5 minutes'
        and (select count(*) from public.newsletter_confirmation_items i join public.newsletter_subscriptions s on s.id = i.subscription_id
          where i.batch_id = b.id and s.confirmation_token_hash = i.token_hash) = cardinality(selected_topics))
    or exists(select 1 from public.newsletter_jobs j join public.newsletter_subscriptions s on s.id = j.subscription_id
      where s.email = p_email and s.mail_mode = p_mode and j.status = 'processing') then
    return null;
  end if;
  foreach topic_name in array selected_topics loop
    select * into sub from public.newsletter_subscriptions
      where email = p_email and mail_mode = p_mode and topic = topic_name for update;
    if found and (select count(*) from public.newsletter_jobs j
      where j.kind = 'confirmation' and j.created_at > now() - interval '1 day'
        and (j.subscription_id = sub.id or exists(select 1 from public.newsletter_confirmation_items i
          where i.batch_id = j.confirmation_batch_id and i.subscription_id = sub.id))) >= 5 then
      return null;
    end if;
  end loop;

  insert into public.newsletter_confirmation_batches(email, mail_mode, token_hash, topics)
    values(p_email, p_mode, p_token_hash, selected_topics) returning id into batch_id;
  foreach topic_name in array selected_topics loop
    new_hash := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    -- Keep an active subscription active until confirmation, and an opt-out inactive.
    insert into public.newsletter_subscriptions(email, mail_mode, topic, consent_version, confirmation_token_hash)
      values(p_email, p_mode, topic_name, p_consent_version, new_hash)
      on conflict(email, mail_mode, topic) do update set confirmation_token_hash = new_hash,
        confirmation_expires_at = now() + interval '48 hours', token_consumed = false,
        requested_at = now(), consent_version = p_consent_version
      returning * into sub;
    update public.newsletter_jobs j set status = 'cancelled', message = null
      where j.kind = 'confirmation' and j.status = 'pending'
        and (j.subscription_id = sub.id or j.confirmation_batch_id in (
          select i.batch_id from public.newsletter_confirmation_items i where i.subscription_id = sub.id));
    insert into public.newsletter_confirmation_items(batch_id, subscription_id, token_hash) values(batch_id, sub.id, new_hash);
    primary_id := coalesce(primary_id, sub.id);
  end loop;
  insert into public.newsletter_jobs(subscription_id, kind, message, confirmation_batch_id)
    values(primary_id, 'confirmation', p_message, batch_id) returning id into job_id;
  return job_id;
end;
$$;

revoke all on function public.newsletter_request_topics(text,text,text,jsonb,text,text,text[]) from public, anon, authenticated;
grant execute on function public.newsletter_request_topics(text,text,text,jsonb,text,text,text[]) to service_role;
