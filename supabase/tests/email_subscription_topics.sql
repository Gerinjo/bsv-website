-- Isolated PostgreSQL only; all test data is rolled back.
begin;
set local role service_role;
do $$
declare info_id uuid; newsletter_id uuid; job uuid; result jsonb;
begin
  job := public.newsletter_request_topic('topics@example.org', 'test', repeat('1',64), '{}', 'info-v1', 'info-ip', 'club_info');
  select subscription_id into info_id from public.newsletter_jobs where id = job;
  assert info_id is not null;
  assert (select topic = 'club_info' and status = 'pending' from public.newsletter_subscriptions where id = info_id);
  assert not exists(select 1 from public.newsletter_subscriptions where email = 'topics@example.org' and topic = 'newsletter');

  result := public.newsletter_confirm(repeat('1',64), 'test', repeat('2',64), '{}');
  assert result->>'topic' = 'club_info' and result->>'status' = 'confirmed';
  assert (select confirmed_consent_version = 'info-v1' from public.newsletter_subscriptions where id = info_id);

  -- Newsletter consent still requires its own link for the same address.
  result := public.newsletter_request_membership('topics@example.org', 'test', repeat('3',64), '{}', 'membership-v1', 'BSV-20260925-110000-ABCD');
  assert result->>'status' = 'queued', 'information consent does not authorize the newsletter';
  select id into newsletter_id from public.newsletter_subscriptions where email = 'topics@example.org' and topic = 'newsletter';
  assert newsletter_id is not null and newsletter_id <> info_id;
  assert (select status = 'pending' from public.newsletter_subscriptions where id = newsletter_id);
  result := public.newsletter_confirm(repeat('3',64), 'test', repeat('4',64), '{}');
  assert result->>'topic' = 'newsletter' and result->>'status' = 'confirmed';
  update public.newsletter_jobs set status = 'sent', message = null where subscription_id in (info_id, newsletter_id);

  result := public.newsletter_unsubscribe(repeat('2',64), 'test');
  assert result->>'topic' = 'club_info';
  assert (select status = 'unsubscribed' from public.newsletter_subscriptions where id = info_id);
  assert (select status = 'confirmed' from public.newsletter_subscriptions where id = newsletter_id), 'info unsubscribe preserves newsletter';
  assert (select count(*) = 1 from public.newsletter_jobs where kind = 'unsubscribe' and subscription_id = info_id);
  assert not exists(select 1 from public.newsletter_jobs where kind = 'unsubscribe' and subscription_id = newsletter_id);
  result := public.newsletter_confirm(repeat('1',64), 'test', repeat('5',64), '{}');
  assert result->>'status' = 'invalid', 'an old link cannot undo info unsubscribe';

  -- Rejoining one topic leaves the other topic's tokens and consent unchanged.
  update public.newsletter_jobs set status = 'sent' where subscription_id = info_id;
  update public.newsletter_subscriptions set requested_at = now() - interval '10 minutes' where id = info_id;
  job := public.newsletter_request_topic('topics@example.org', 'test', repeat('5',64), '{}', 'info-v2', 'info-ip', 'club_info');
  assert job is not null;
  result := public.newsletter_confirm(repeat('5',64), 'test', repeat('6',64), '{}');
  assert result->>'status' = 'confirmed';
  result := public.newsletter_unsubscribe(repeat('4',64), 'test');
  assert result->>'topic' = 'newsletter';
  assert (select status = 'confirmed' and unsubscribe_token_hash = repeat('6',64) from public.newsletter_subscriptions where id = info_id), 'newsletter unsubscribe preserves info consent and link';

  begin
    perform public.newsletter_request_topic('invalid@example.org', 'test', repeat('7',64), '{}', 'bad', 'invalid-ip', 'all');
    assert false, 'unknown topic must be rejected';
  exception when raise_exception then
    assert sqlerrm = 'invalid_subscription_topic';
  end;
  assert not has_function_privilege('anon', 'public.newsletter_request_topic(text,text,text,jsonb,text,text,text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.newsletter_request_topic(text,text,text,jsonb,text,text,text)', 'execute');
  assert not has_table_privilege('anon', 'public.newsletter_subscriptions', 'select');
end;
$$;
rollback;
