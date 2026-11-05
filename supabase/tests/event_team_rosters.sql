begin;
set local role service_role;
do $$
declare
  payload jsonb := '{"thema":"event-bodensee-indoor-girls-cup","routing_schluessel":"person-jerome-ernsberger","anfrageart":"kontakt","empfaenger_email":"qa@example.invalid","empfaenger_emails":["qa@example.invalid"],"vorname":"Test","nachname":"Roster","email":"qa@example.invalid","nachricht":"SQL capacity test – rolled back","datenschutz_bestaetigt":true}'::jsonb;
  result jsonb; before_count integer; actual integer; roster jsonb; n integer;
begin
  assert not exists(select 1 from public.event_team_categories where capacity is not null and waiting_capacity<>2), 'Every capped tournament must have two waiting places';
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
  -- D-Juniorinnen: nine external confirmed teams plus the host, then two waiting.
  result := public.submit_event_registration(payload,'SQL D Kapazitätstest','[{"division":"D","count":11}]','test');
  select count(*) into actual from jsonb_array_elements(result->'allocations') item where item->>'status'='confirmed';
  assert actual=9, 'Nine external D teams must be confirmed';
  select count(*) into actual from jsonb_array_elements(result->'allocations') item where item->>'status'='waiting';
  assert actual=2, 'Only two D teams may be on the waiting list';
  assert (select min((item->>'position')::integer) from jsonb_array_elements(result->'allocations') item where item->>'status'='waiting')=11,
    'The first D waiting place must be position 11';
  select count(*) into before_count from public.contact_anfragen;
  begin
    perform public.submit_event_registration(payload,'SQL D Überlauf','[{"division":"D","count":1}]','test');
    raise exception 'Expected EVENT_FULL';
  exception when raise_exception then
    if sqlerrm not like 'EVENT_FULL:%' then raise; end if;
  end;
  select count(*) into actual from public.contact_anfragen;
  assert actual=before_count, 'A full D category must not save an inquiry';
  assert not (public.get_event_team_roster('event-bodensee-indoor-girls-cup')::text like '%SQL Kapazitätstest%'), 'Test teams must remain private';
  assert not (public.get_event_team_roster('event-bodensee-indoor-girls-cup')::text like '%example.invalid%'), 'No contact data may appear in the public roster';
  payload := jsonb_set(payload,'{thema}','"event-urmel-cup"');
  perform public.submit_event_registration(payload,'SQL Bambini','[{"division":"Bambini","count":12}]','test');
  select count(*) into actual from public.event_team_registrations where event_topic='event-urmel-cup' and mode='test' and status='waiting';
  assert actual=0, 'Bambini do not have a waiting list';
  payload := jsonb_set(payload,'{team_time_slots}','["09:00","15:00"]');
  result := public.submit_event_registration(payload,'SQL Wunschzeiten','[{"division":"Bambini","count":3}]','test');
  select count(*) into actual from public.event_team_registrations
    where inquiry_id=(result->>'id')::uuid and preferred_time_slots=array['09:00','15:00'];
  assert actual=3, 'All three teams must preserve both selected times';
  select count(*) into before_count from public.contact_anfragen;
  begin
    perform public.submit_event_registration(jsonb_set(payload,'{team_time_slots}','["18:00"]'),
      'SQL Ungültige Wunschzeit','[{"division":"Bambini","count":1}]','test');
    raise exception 'Expected invalid time preference';
  exception when check_violation then null;
  end;
  select count(*) into actual from public.contact_anfragen;
  assert actual=before_count, 'Invalid time preferences must roll back the whole registration';
  -- On a fresh test database only BSV I is seeded. The fixture is rolled back.
  perform 1 from public.event_team_categories where event_topic='event-bambini-weihnachten-2026' and category='Bambini' for update;
  for n in 2..3 loop
    if not exists(select 1 from public.event_team_registrations where event_topic='event-bambini-weihnachten-2026'
      and category='Bambini' and mode='live' and club_key='bsv nordstern radolfzell' and team_number=n) then
      insert into public.event_team_registrations(event_topic,category,mode,club_name,team_number,position,status,preferred_time_slots)
      select 'event-bambini-weihnachten-2026','Bambini','live','BSV Nordstern Radolfzell',n,coalesce(max(position),0)+1,'confirmed',
        array[case n when 2 then '12:00' else '15:00' end]
      from public.event_team_registrations where event_topic='event-bambini-weihnachten-2026' and category='Bambini' and mode='live';
    end if;
  end loop;
  roster := public.get_event_team_roster('event-bambini-weihnachten-2026')->0->'teams';
  assert roster->0->>'clubName'='BSV Nordstern Radolfzell'
    and roster->1->>'clubName'='BSV Nordstern Radolfzell'
    and roster->2->>'clubName'='BSV Nordstern Radolfzell', 'The three BSV teams must lead the public roster';
  assert roster->0->'timeSlots'='["09:00"]'::jsonb
    and roster->1->'timeSlots'='["12:00"]'::jsonb
    and roster->2->'timeSlots'='["15:00"]'::jsonb, 'BSV I, II and III have consecutive preferred start times';
  assert not has_function_privilege('anon','public.get_event_team_roster(text)','execute'), 'Anonymous clients must use the sanitized HTTP endpoint';
  assert not has_table_privilege('anon','public.event_team_registrations','select'), 'The underlying registrations must not be public';
end $$;
rollback;
