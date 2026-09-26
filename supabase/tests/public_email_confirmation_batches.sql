-- Run after the newsletter migrations on an isolated database. No mail is sent.
begin;
set local role service_role;
do $$
declare
  job uuid; batch uuid; r jsonb; first_hash text; selected text[]; attempt integer;
begin
  job := public.newsletter_request_topics('public-both@example.org', 'test', repeat('a',64), '{}', 'combined-v1', 'public-both-ip', array['newsletter','club_info']);
  assert job is not null;
  select confirmation_batch_id into batch from public.newsletter_jobs where id = job;
  assert (select count(*) = 2 from public.newsletter_confirmation_items where batch_id = batch);
  assert (select count(*) = 1 from public.newsletter_jobs where confirmation_batch_id = batch and kind = 'confirmation');
  assert (select count(*) = 2 from public.newsletter_subscriptions where email = 'public-both@example.org' and status = 'pending' and consent_version = 'combined-v1');
  assert (select hits = 1 from public.newsletter_rate_limits where key = 'public-both-ip');
  -- A repeated submission keeps the first link and cannot send a second email.
  assert public.newsletter_request_topics('public-both@example.org', 'test', repeat('b',64), '{}', 'combined-v1', 'public-both-ip', array['club_info','newsletter']) is null;
  assert (select count(*) = 1 from public.newsletter_confirmation_batches where email = 'public-both@example.org');
  r := public.newsletter_confirm_batch(repeat('a',64), 'live', '{}', '{}');
  assert r->>'status' = 'invalid';
  r := public.newsletter_confirm_batch(repeat('a',64), 'test', jsonb_build_object('newsletter',repeat('c',64),'club_info',repeat('d',64)), '{}');
  assert r->>'status' = 'confirmed';
  assert (select count(*) = 2 from public.newsletter_subscriptions where email = 'public-both@example.org' and status = 'confirmed' and confirmed_consent_version = 'combined-v1');
  assert (select count(*) = 1 from public.newsletter_jobs where confirmation_batch_id = batch and kind = 'welcome');
  r := public.newsletter_confirm_batch(repeat('a',64), 'test', '{}', null);
  assert r->>'status' = 'already_confirmed';
  assert (select count(*) = 1 from public.newsletter_jobs where confirmation_batch_id = batch and kind = 'welcome');
  r := public.newsletter_unsubscribe(repeat('d',64), 'test');
  assert r->>'status' = 'unsubscribed';
  assert (select status = 'confirmed' from public.newsletter_subscriptions where email = 'public-both@example.org' and topic = 'newsletter');
  r := public.newsletter_confirm_batch(repeat('a',64), 'test', '{}', null);
  assert r->>'status' = 'invalid', 'old combined links must not undo an opt-out';

  -- New consent can cover an active newsletter and an opted-out information list.
  update public.newsletter_confirmation_batches set created_at = now() - interval '10 minutes' where id = batch;
  job := public.newsletter_request_topics('public-both@example.org', 'test', repeat('e',64), '{}', 'combined-v2', 'public-both-ip', array['newsletter','club_info']);
  assert job is not null;
  assert (select status = 'confirmed' and unsubscribe_token_hash = repeat('c',64) and confirmed_consent_version = 'combined-v1'
    from public.newsletter_subscriptions where email = 'public-both@example.org' and topic = 'newsletter');
  assert (select status = 'unsubscribed' from public.newsletter_subscriptions where email = 'public-both@example.org' and topic = 'club_info');
  r := public.newsletter_confirm_batch(repeat('e',64), 'test', jsonb_build_object('newsletter',repeat('f',64),'club_info',repeat('1',64)), '{}');
  assert r->>'status' = 'confirmed';
  assert (select count(*) = 2 from public.newsletter_subscriptions where email = 'public-both@example.org' and status = 'confirmed' and confirmed_consent_version = 'combined-v2');

  -- Upgrading an unconfirmed single choice to both works immediately.
  perform public.newsletter_request_topic('public-change@example.org', 'test', repeat('2',64), '{}', 'single-v1', 'public-change-ip', 'newsletter');
  job := public.newsletter_request_topics('public-change@example.org', 'test', repeat('3',64), '{}', 'combined-v1', 'public-change-ip', array['newsletter','club_info']);
  assert job is not null;
  r := public.newsletter_confirm(repeat('2',64), 'test', repeat('4',64), '{}');
  assert r->>'status' = 'invalid';
  assert (select count(*) = 1 from public.newsletter_jobs j join public.newsletter_subscriptions s on s.id = j.subscription_id
    where s.email = 'public-change@example.org' and j.kind = 'confirmation' and j.status = 'pending');
  -- A later single request supersedes the entire batch, never partially confirming it.
  update public.newsletter_subscriptions set requested_at = now() - interval '10 minutes' where email = 'public-change@example.org';
  perform public.newsletter_request_topic('public-change@example.org', 'test', repeat('5',64), '{}', 'single-v2', 'public-change-ip', 'club_info');
  r := public.newsletter_confirm_batch(repeat('3',64), 'test', jsonb_build_object('newsletter',repeat('6',64),'club_info',repeat('7',64)), '{}');
  assert r->>'status' = 'invalid';
  assert not exists(select 1 from public.newsletter_subscriptions where email = 'public-change@example.org' and status = 'confirmed');

  -- Expiry, in-flight jobs and IP limits must never create a partial signup.
  job := public.newsletter_request_topics('public-expired@example.org', 'test', repeat('8',64), '{}', 'combined-v1', 'public-expired-ip', array['newsletter','club_info']);
  update public.newsletter_confirmation_batches set expires_at = now() - interval '1 minute' where token_hash = repeat('8',64);
  r := public.newsletter_confirm_batch(repeat('8',64), 'test', '{}', null);
  assert r->>'status' = 'expired';
  job := public.newsletter_request_topic('public-busy@example.org', 'test', repeat('9',64), '{}', 'single-v1', 'public-busy-ip', 'newsletter');
  update public.newsletter_jobs set status = 'processing', locked_until = now() + interval '3 minutes' where id = job;
  assert public.newsletter_request_topics('public-busy@example.org', 'test', repeat('0',64), '{}', 'combined-v1', 'public-busy-ip', array['newsletter','club_info']) is null;
  assert not exists(select 1 from public.newsletter_subscriptions where email = 'public-busy@example.org' and topic = 'club_info');
  insert into public.newsletter_rate_limits(key,hits) values('public-limited-ip',10);
  assert public.newsletter_request_topics('public-limited@example.org', 'test', repeat('0',64), '{}', 'combined-v1', 'public-limited-ip', array['newsletter','club_info']) is null;
  assert not exists(select 1 from public.newsletter_subscriptions where email = 'public-limited@example.org');

  -- The per-topic daily limit includes combined requests, whichever item is primary.
  for attempt in 1..5 loop
    job := public.newsletter_request_topics('public-daily@example.org', 'test', repeat(md5('daily-' || attempt),2), '{}', 'combined-v1', 'public-daily-ip', array['newsletter','club_info']);
    assert job is not null;
    update public.newsletter_confirmation_batches set created_at = now() - interval '10 minutes' where email = 'public-daily@example.org';
  end loop;
  select confirmation_token_hash into first_hash from public.newsletter_subscriptions where email = 'public-daily@example.org' and topic = 'newsletter';
  assert public.newsletter_request_topics('public-daily@example.org', 'test', repeat(md5('daily-6'),2), '{}', 'combined-v1', 'public-daily-ip', array['newsletter','club_info']) is null;
  assert (select confirmation_token_hash = first_hash from public.newsletter_subscriptions where email = 'public-daily@example.org' and topic = 'newsletter');

  foreach selected slice 1 in array array[array['newsletter','newsletter'], array['club_info','unknown'], array['newsletter',null]] loop
    begin
      perform public.newsletter_request_topics('public-invalid@example.org', 'test', repeat('0',64), '{}', 'combined-v1', 'public-invalid-ip', selected);
      assert false, 'invalid topics must be rejected';
    exception when raise_exception then null;
    end;
  end loop;
  assert not exists(select 1 from public.newsletter_subscriptions where email = 'public-invalid@example.org');
  assert not has_function_privilege('anon','public.newsletter_request_topics(text,text,text,jsonb,text,text,text[])','execute');
  assert not has_function_privilege('authenticated','public.newsletter_request_topics(text,text,text,jsonb,text,text,text[])','execute');
  assert not exists(select 1 from pg_proc where oid = 'public.newsletter_request_topics(text,text,text,jsonb,text,text,text[])'::regprocedure and prosecdef);
end;
$$;
rollback;
