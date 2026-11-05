-- Use the allocator's category lock while expanding and promoting existing entries.
select 1 from public.event_team_categories
where event_topic = 'event-bodensee-indoor-girls-cup' and category = 'D'
for update;

update public.event_team_categories
set capacity = 10, waiting_capacity = 4
where event_topic = 'event-bodensee-indoor-girls-cup' and category = 'D';

-- Positions 9 and 10 now belong to the tournament, preserving arrival order.
update public.event_team_registrations
set status = 'confirmed'
where event_topic = 'event-bodensee-indoor-girls-cup' and category = 'D'
  and status = 'waiting' and position <= 10;

-- The team suffix belongs in team_number; otherwise the roster renders "II I".
update public.event_team_registrations
set club_name = 'BSV Nordstern Radolfzell', team_number = 2
where event_topic = 'event-bodensee-indoor-girls-cup' and category = 'D'
  and club_name = 'BSV Nordstern Radolfzell II' and team_number = 1;
