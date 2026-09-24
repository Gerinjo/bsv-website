-- Run against an isolated PostgreSQL database after the newsletter migration.
begin;
set local role service_role;
do $$
declare job uuid; sub uuid; result jsonb; claim public.newsletter_jobs; count_jobs integer;
begin
  job := public.newsletter_request('fan@example.org', 'test', repeat('a',64), '{"to":"fan@example.org"}', 'v1', 'ip-one');
  assert job is not null, 'initial registration queues a confirmation';
  select subscription_id into sub from public.newsletter_jobs where id = job;
  assert (select status = 'pending' and confirmed_at is null from public.newsletter_subscriptions where id = sub), 'not eligible before confirmation';
  assert public.newsletter_request('fan@example.org', 'test', repeat('b',64), '{}', 'v1', 'ip-one') is null, 'cooldown blocks repeated mail';
  assert (select confirmation_token_hash = repeat('a',64) from public.newsletter_subscriptions where id = sub), 'cooldown preserves delivered link';
  result := public.newsletter_confirm(repeat('a',64), 'live', repeat('c',64), '{}');
  assert result->>'status' = 'invalid', 'test confirmation cannot become a live recipient';
  result := public.newsletter_confirm(repeat('f',64), 'test', repeat('c',64), '{}');
  assert result->>'status' = 'invalid', 'forged token is rejected';
  update public.newsletter_subscriptions set confirmation_expires_at = now() - interval '1 second' where id = sub;
  result := public.newsletter_confirm(repeat('a',64), 'test', repeat('c',64), '{}');
  assert result->>'status' = 'expired', 'expired token is rejected';
  assert (select status = 'pending' from public.newsletter_subscriptions where id = sub);
  update public.newsletter_subscriptions set confirmation_expires_at = now() + interval '1 day' where id = sub;
  result := public.newsletter_confirm(repeat('a',64), 'test', repeat('c',64), '{"to":"fan@example.org"}');
  assert result->>'status' = 'confirmed';
  assert (select status = 'confirmed' and confirmed_at is not null and confirmed_consent_version = 'v1' from public.newsletter_subscriptions where id = sub);
  assert (select count(*) = 1 from public.newsletter_jobs where subscription_id = sub and kind = 'welcome'), 'one welcome event';
  result := public.newsletter_confirm(repeat('a',64), 'test', repeat('d',64), '{}');
  assert result->>'status' = 'already_confirmed';
  assert (select count(*) = 1 from public.newsletter_jobs where subscription_id = sub and kind = 'welcome'), 'repeated click does not resend welcome';
  assert (select unsubscribe_token_hash = repeat('c',64) from public.newsletter_subscriptions where id = sub), 'repeated click preserves unsubscribe link';
  select * into claim from public.newsletter_claim_job('test');
  assert claim.kind = 'welcome' and claim.attempts = 1;
  assert not exists(select * from public.newsletter_claim_job('test')), 'live lease prevents competing worker';
  update public.newsletter_jobs set locked_until = now() - interval '1 second' where id = claim.id;
  select * into claim from public.newsletter_claim_job('test');
  assert claim.attempts = 2, 'crashed worker can be recovered';
  update public.newsletter_jobs set status = 'sent', message = null, locked_until = null where id = claim.id;
  result := public.newsletter_unsubscribe(repeat('c',64), 'test');
  assert result->>'status' = 'unsubscribed';
  assert (select status = 'unsubscribed' from public.newsletter_subscriptions where id = sub);
  result := public.newsletter_confirm(repeat('a',64), 'test', repeat('d',64), '{}');
  assert result->>'status' = 'invalid', 'old link cannot reverse unsubscribe';
  result := public.newsletter_unsubscribe(repeat('c',64), 'test');
  assert (select count(*) = 1 from public.newsletter_jobs where subscription_id = sub and kind = 'unsubscribe'), 'unsubscribe idempotent';
  update public.newsletter_jobs set status = 'sent' where subscription_id = sub and kind = 'unsubscribe';
  update public.newsletter_subscriptions set requested_at = now() - interval '6 minutes' where id = sub;
  job := public.newsletter_request('fan@example.org', 'test', repeat('b',64), '{}', 'v2', 'ip-one');
  assert job is not null;
  assert (select status = 'unsubscribed' and confirmed_consent_version = 'v1' from public.newsletter_subscriptions where id = sub), 'new request alone never restores consent';
  result := public.newsletter_confirm(repeat('b',64), 'test', repeat('d',64), '{}');
  assert result->>'status' = 'confirmed';
  assert (select confirmed_consent_version = 'v2' from public.newsletter_subscriptions where id = sub);
  -- Address + delivery mode form independent identities.
  job := public.newsletter_request('fan@example.org', 'live', repeat('e',64), '{}', 'v1', 'ip-two');
  assert job is not null;
  assert (select count(*) = 2 from public.newsletter_subscriptions where email = 'fan@example.org');
  -- No direct API role can read or mutate subscribers, queued links, or RPCs.
  assert not has_table_privilege('anon', 'public.newsletter_subscriptions', 'select');
  assert not has_table_privilege('authenticated', 'public.newsletter_jobs', 'select');
  assert not has_function_privilege('anon', 'public.newsletter_confirm(text,text,text,jsonb)', 'execute');
  assert not has_function_privilege('authenticated', 'public.newsletter_request(text,text,text,jsonb,text,text)', 'execute');
  -- Retries outside the provider's idempotency window stop instead of duplicating mail.
  update public.newsletter_jobs set first_attempt_at = now() - interval '24 hours', locked_until = null where id = job;
  perform public.newsletter_cleanup();
  assert (select status = 'failed' and message is null from public.newsletter_jobs where id = job);
  -- Pending personal data expires; consent records are retained.
  update public.newsletter_subscriptions set requested_at = now() - interval '8 days' where mail_mode = 'live';
  perform public.newsletter_cleanup();
  assert not exists(select 1 from public.newsletter_subscriptions where mail_mode = 'live');
  assert exists(select 1 from public.newsletter_subscriptions where mail_mode = 'test');
end;
$$;
rollback;
