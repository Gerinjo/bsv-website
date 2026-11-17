-- Four waiting places for the sold-out Christmas event; Girls Cup keeps two per age group.
alter table public.event_team_categories
  drop constraint event_team_categories_waiting_limit_two;
alter table public.event_team_categories
  add constraint event_team_categories_waiting_limit check (
    waiting_capacity <= case
      when event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini' then 4
      else 2
    end
  );

do $migration$
begin
  perform 1 from public.event_team_categories
    where event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini'
    for update;
  if (select count(*) from public.event_team_registrations
      where event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini'
        and mode = 'live' and status = 'confirmed') <> 18
    or exists (select 1 from public.event_team_registrations
      where event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini'
        and mode = 'live' and position > 18) then
    raise exception 'Bambini-Anmeldestand hat sich geändert. Bestehende Teams vor der Umstellung prüfen.';
  end if;
  update public.event_team_categories set capacity = 18, waiting_capacity = 4
    where event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini';
end $migration$;
