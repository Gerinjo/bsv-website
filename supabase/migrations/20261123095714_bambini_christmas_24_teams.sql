-- Keep the allocator's category lock while expanding and promoting existing teams.
select 1 from public.event_team_categories
where event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini'
for update;

update public.event_team_categories
set capacity = 24, waiting_capacity = 4
where event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini';

-- Preserve arrival order, team numbers and preferred start times.
update public.event_team_registrations
set status = 'confirmed'
where event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini'
  and status = 'waiting' and position <= 24;
