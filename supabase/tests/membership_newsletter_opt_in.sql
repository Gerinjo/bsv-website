-- Isolated database only, after both newsletter schema migrations.
begin;
set local role service_role;
do $$
declare result jsonb; sub uuid; n integer; job uuid;
begin
  result := public.newsletter_request_membership('member@example.org', 'test', repeat('a',64), '{}', 'membership-v1', 'BSV-20260924-220000-AAAA');
  assert result->>'status' = 'queued';
  select id into sub from public.newsletter_subscriptions where email = 'member@example.org' and mail_mode = 'test';
  assert (select status = 'pending' and confirmed_at is null and consent_version = 'membership-v1' from public.newsletter_subscriptions where id = sub);
  assert (select count(*) = 1 from public.newsletter_jobs where subscription_id = sub and kind = 'confirmation');
  assert not exists(select 1 from public.newsletter_jobs where subscription_id = sub and kind = 'welcome'), 'no welcome before DOI';

  result := public.newsletter_request_membership('member@example.org', 'test', repeat('b',64), '{}', 'membership-v1', 'BSV-20260924-220000-AAAA');
  assert result->>'status' = 'already_requested';
  result := public.newsletter_request_membership('member@example.org', 'test', repeat('b',64), '{}', 'membership-v1', 'BSV-20260924-220001-BBBB');
  assert result->>'status' = 'pending';
  assert (select count(*) = 1 from public.newsletter_jobs where subscription_id = sub), 'duplicate application keeps original link';
  assert (select confirmation_token_hash = repeat('a',64) from public.newsletter_subscriptions where id = sub);

  result := public.newsletter_confirm(repeat('a',64), 'test', repeat('c',64), '{}');
  assert result->>'status' = 'confirmed';
  result := public.newsletter_request_membership('member@example.org', 'test', repeat('b',64), '{}', 'membership-v2', 'BSV-20260924-220002-CCCC');
  assert result->>'status' = 'already_confirmed';
  assert (select count(*) = 2 from public.newsletter_jobs where subscription_id = sub), 'confirmed subscriber gets no new confirmation or welcome';
  assert (select confirmed_consent_version = 'membership-v1' and unsubscribe_token_hash = repeat('c',64) from public.newsletter_subscriptions where id = sub);

  perform public.newsletter_unsubscribe(repeat('c',64), 'test');
  update public.newsletter_subscriptions set requested_at = now() - interval '10 minutes' where id = sub;
  -- Replaying applications that were queued, pending or confirmed cannot reactivate.
  for n in 0..2 loop
    result := public.newsletter_request_membership('member@example.org', 'test', repeat('b',64), '{}', 'membership-v2',
      case n when 0 then 'BSV-20260924-220000-AAAA' when 1 then 'BSV-20260924-220001-BBBB' else 'BSV-20260924-220002-CCCC' end);
    assert result->>'status' = 'already_requested';
  end loop;
  assert (select status = 'unsubscribed' and token_consumed from public.newsletter_subscriptions where id = sub);
  assert (select count(*) = 3 from public.newsletter_jobs where subscription_id = sub);
  -- A genuinely new opted-in application may request DOI, never auto-subscribe.
  result := public.newsletter_request_membership('member@example.org', 'test', repeat('d',64), '{}', 'membership-v2', 'BSV-20260924-220003-DDDD');
  assert result->>'status' = 'queued';
  assert (select status = 'unsubscribed' and not token_consumed from public.newsletter_subscriptions where id = sub);
  result := public.newsletter_confirm(repeat('a',64), 'test', repeat('e',64), '{}');
  assert result->>'status' = 'invalid';
  result := public.newsletter_confirm(repeat('d',64), 'test', repeat('e',64), '{}');
  assert result->>'status' = 'confirmed';

  result := public.newsletter_request_membership('member@example.org', 'live', repeat('f',64), '{}', 'membership-v1', 'BSV-20260924-220000-AAAA');
  assert result->>'status' = 'queued', 'test consent does not count in live mode';

  job := public.newsletter_request('homepage@example.org', 'test', repeat('1',64), '{}', 'homepage-v1', 'homepage-ip');
  result := public.newsletter_request_membership('homepage@example.org', 'test', repeat('2',64), '{}', 'membership-v1', 'BSV-20260924-220004-EEEE');
  assert result->>'status' = 'pending', 'existing homepage link stays valid';
  update public.newsletter_subscriptions set confirmation_expires_at = now() - interval '1 minute', requested_at = now() - interval '3 days'
    where email = 'homepage@example.org';
  result := public.newsletter_request_membership('homepage@example.org', 'test', repeat('3',64), '{}', 'membership-v1', 'BSV-20260924-220005-FFFF');
  assert result->>'status' = 'queued', 'expired links are replaced for a new application';

  assert not has_table_privilege('anon', 'public.newsletter_membership_requests', 'select');
  assert not has_table_privilege('authenticated', 'public.newsletter_membership_requests', 'insert');
  assert not has_function_privilege('anon', 'public.newsletter_request_membership(text,text,text,jsonb,text,text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.newsletter_request_membership(text,text,text,jsonb,text,text)', 'execute');
end;
$$;
rollback;
