-- Boundary checks use test-mode fixtures and roll back every change. No emails are sent.
begin;
set local role service_role;
do $$
declare
  payload jsonb := '{"thema":"event-bambini-weihnachten-2026","routing_schluessel":"person-jerome-ernsberger","anfrageart":"kontakt","empfaenger_email":"jerome.ernsberger@bsvnordstern.de","empfaenger_emails":["jerome.ernsberger@bsvnordstern.de"],"vorname":"Test","nachname":"Kapazität","email":"jerome.ernsberger@bsvnordstern.de","nachricht":"SQL capacity test – rolled back","datenschutz_bestaetigt":true,"team_time_slots":["09:00"]}'::jsonb;
  result jsonb;
  before_roster jsonb;
  before_count integer;
begin
  perform 1 from public.event_team_categories
    where event_topic='event-bambini-weihnachten-2026' and category='Bambini' for update;
  assert (select count(*)=1 and max(position)=1 from public.event_team_registrations
    where event_topic='event-bambini-weihnachten-2026' and category='Bambini' and mode='test'),
    'Capacity fixture requires only the seeded test host';
  before_roster := public.get_event_team_roster('event-bambini-weihnachten-2026');
  perform public.submit_event_registration(payload,'SQL Bambini Füllteams','[{"division":"Bambini","count":22}]','test');
  result := public.submit_event_registration(payload,'SQL Bambini Grenze','[{"division":"Bambini","count":2}]','test');
  assert result->'allocations'->0->>'status'='confirmed'
    and result->'allocations'->0->>'position'='24', 'Team 24 must be confirmed';
  assert result->'allocations'->1->>'status'='waiting'
    and result->'allocations'->1->>'position'='25', 'Team 25 must get the first waiting place';
  perform public.submit_event_registration(payload,'SQL Bambini Warteliste','[{"division":"Bambini","count":3}]','test');
  assert (select count(*)=4 from public.event_team_registrations
    where event_topic='event-bambini-weihnachten-2026' and category='Bambini' and mode='test' and status='waiting'),
    'Exactly four waiting places must be available';
  select count(*) into before_count from public.contact_anfragen;
  begin
    perform public.submit_event_registration(payload,'SQL Bambini Überlauf','[{"division":"Bambini","count":1}]','test');
    raise exception 'Expected EVENT_FULL';
  exception when raise_exception then
    if sqlerrm not like 'EVENT_FULL:%' then raise; end if;
  end;
  assert (select count(*)=before_count from public.contact_anfragen), 'Overflow must roll back the inquiry';
  assert public.get_event_team_roster('event-bambini-weihnachten-2026')=before_roster,
    'Test registrations must not change the public roster';
end $$;
rollback;
