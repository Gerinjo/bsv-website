begin;

do $$
declare
  first_delivery public.football_alert_deliveries;
  retry_delivery public.football_alert_deliveries;
  amount integer;
  key text := repeat('f', 64);
begin
  if has_table_privilege('anon', 'public.football_alert_deliveries', 'SELECT')
    or has_table_privilege('authenticated', 'public.football_alert_settings', 'SELECT')
    or has_table_privilege('anon', 'public.football_alert_runs', 'INSERT')
    or has_function_privilege('anon', 'public.claim_football_alert(text,text,text,text,text,date,jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.claim_football_alert(text,text,text,text,text,date,jsonb)', 'EXECUTE') then
    raise exception 'Browser roles can access alert data';
  end if;
  if exists(select 1 from pg_class where oid in ('public.football_alert_settings'::regclass, 'public.football_alert_deliveries'::regclass, 'public.football_alert_runs'::regclass) and not relrowsecurity) then
    raise exception 'RLS missing';
  end if;
  select * into first_delivery from public.claim_football_alert(key, 'test', 'training_conflict', 'sql-test', 'team--jugend--u13-d3', '2099-01-01', '{"subject":"first"}');
  if first_delivery.id is null then raise exception 'Claim failed'; end if;
  select count(*) into amount from public.claim_football_alert(key, 'test', 'training_conflict', 'sql-test', 'team--jugend--u13-d3', '2099-01-01', '{"subject":"second"}');
  if amount <> 0 then raise exception 'Concurrent claim was allowed'; end if;
  update public.football_alert_deliveries set status = 'failed', locked_until = now() - interval '1 second' where id = first_delivery.id;
  select * into retry_delivery from public.claim_football_alert(key, 'test', 'training_conflict', 'sql-test', 'team--jugend--u13-d3', '2099-01-01', '{"subject":"second"}');
  if retry_delivery.id <> first_delivery.id or retry_delivery.lease_id = first_delivery.lease_id
    or retry_delivery.message->>'subject' <> 'first' or retry_delivery.attempts <> 2 then raise exception 'Retry identity or payload changed'; end if;
  update public.football_alert_deliveries set status = 'sent', locked_until = now() - interval '1 hour' where id = first_delivery.id;
  select count(*) into amount from public.claim_football_alert(key, 'test', 'training_conflict', 'sql-test', 'team--jugend--u13-d3', '2099-01-01', '{}');
  if amount <> 0 then raise exception 'Already sent warning reclaimed'; end if;
  select count(*) into amount from public.claim_football_alert(key, 'live', 'training_conflict', 'sql-test', 'team--jugend--u13-d3', '2099-01-01', '{}');
  if amount <> 1 then raise exception 'Test delivery consumed live warning'; end if;
  update public.football_alert_deliveries set first_attempt_at = now() - interval '24 hours', locked_until = now() - interval '1 hour', status = 'failed' where event_key = key and mail_mode = 'live';
  select count(*) into amount from public.claim_football_alert(key, 'live', 'training_conflict', 'sql-test', 'team--jugend--u13-d3', '2099-01-01', '{}');
  if amount <> 0 or not exists(select 1 from public.football_alert_deliveries where event_key = key and mail_mode = 'live' and status = 'needs_review') then raise exception 'Unsafe retry after provider idempotency expiry'; end if;
end;
$$;

rollback;
