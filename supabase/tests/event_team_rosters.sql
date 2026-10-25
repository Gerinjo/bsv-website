begin;
set local role service_role;
do $$
declare
  payload jsonb := '{"thema":"event-bodensee-indoor-girls-cup","routing_schluessel":"person-jerome-ernsberger","anfrageart":"kontakt","empfaenger_email":"qa@example.invalid","empfaenger_emails":["qa@example.invalid"],"vorname":"Test","nachname":"Roster","email":"qa@example.invalid","nachricht":"SQL capacity test – rolled back","datenschutz_bestaetigt":true}'::jsonb;
  result jsonb; before_count integer; actual integer;
begin
  -- All nine available external places: seven confirmed and two waiting, plus the seeded BSV.
  result := public.submit_event_registration(payload,'SQL Kapazitätstest','[{"division":"E","count":9}]','test');
  select count(*) into actual from jsonb_array_elements(result->'allocations') item where item->>'status'='confirmed';
  assert actual=7, 'Seven external teams must be confirmed';
  select count(*) into actual from jsonb_array_elements(result->'allocations') item where item->>'status'='waiting';
  assert actual=2, 'Two teams must be on the waiting list';
  select count(*) into before_count from public.contact_anfragen;
  begin
    perform public.submit_event_registration(payload,'SQL Überlauf','[{"division":"D","count":1},{"division":"E","count":1}]','test');
    raise exception 'Expected EVENT_FULL';
  exception when raise_exception then
    if sqlerrm not like 'EVENT_FULL:%' then raise; end if;
  end;
  select count(*) into actual from public.contact_anfragen;
  assert actual=before_count, 'A full category must roll back the whole inquiry';
  select count(*) into actual from public.event_team_registrations where category='D' and mode='test' and not is_host;
  assert actual=0, 'A mixed request must not partly consume another category';
  assert not (public.get_event_team_roster('event-bodensee-indoor-girls-cup')::text like '%SQL Kapazitätstest%'), 'Test teams must remain private';
  assert not (public.get_event_team_roster('event-bodensee-indoor-girls-cup')::text like '%example.invalid%'), 'No contact data may appear in the public roster';
  payload := jsonb_set(payload,'{thema}','"event-urmel-cup"');
  perform public.submit_event_registration(payload,'SQL Bambini','[{"division":"Bambini","count":12}]','test');
  select count(*) into actual from public.event_team_registrations where event_topic='event-urmel-cup' and mode='test' and status='waiting';
  assert actual=0, 'Bambini do not have a waiting list';
  assert not has_function_privilege('anon','public.get_event_team_roster(text)','execute'), 'Anonymous clients must use the sanitized HTTP endpoint';
  assert not has_table_privilege('anon','public.event_team_registrations','select'), 'The underlying registrations must not be public';
end $$;
rollback;
