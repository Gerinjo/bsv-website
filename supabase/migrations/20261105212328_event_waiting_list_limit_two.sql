-- Serialize the change with team allocations and retain every existing registration.
do $migration$
begin
  perform 1 from public.event_team_categories order by event_topic,category for update;
  if exists(select 1 from public.event_team_registrations where status='waiting'
    group by event_topic,category,mode having count(*)>2) then
    raise exception 'Mehr als zwei Wartelistenteams vorhanden. Bestehende Anmeldungen zuerst prüfen.';
  end if;
  update public.event_team_categories set waiting_capacity=2 where capacity is not null;
end $migration$;
alter table public.event_team_categories add constraint event_team_categories_waiting_limit_two check(waiting_capacity<=2);
