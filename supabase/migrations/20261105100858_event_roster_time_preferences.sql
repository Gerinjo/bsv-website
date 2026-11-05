-- Store public team preferences separately from private registration messages.
alter table public.event_team_registrations
  add column preferred_time_slots text[] not null default '{}'
  check (preferred_time_slots <@ array['09:00','12:00','15:00']::text[]
    and cardinality(preferred_time_slots) <= 3
    and array_position(preferred_time_slots, null) is null);

-- Import only the structured, server-generated preference line from older forms.
update public.event_team_registrations r
set preferred_time_slots = array(
  select parts[1] from regexp_matches(
    substring(c.nachricht from 'Priorisierte Zeitfenster: ([^\r\n]+)'),
    '(09:00|12:00|15:00) Uhr', 'g') as matches(parts)
)
from public.contact_anfragen c
where c.id = r.inquiry_id and r.category = 'Bambini';

-- The three December host teams each requested a different start time.
update public.event_team_registrations
set preferred_time_slots = array[case team_number
  when 1 then '09:00' when 2 then '12:00' when 3 then '15:00' end]
where event_topic = 'event-bambini-weihnachten-2026' and category = 'Bambini'
  and mode = 'live' and club_key = 'bsv nordstern radolfzell' and team_number between 1 and 3;

create or replace function public.submit_event_registration(p_contact jsonb, p_club_name text, p_teams jsonb, p_mode text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare inquiry uuid; allocation jsonb; preferences text[];
begin
  insert into public.contact_anfragen(thema,routing_schluessel,anfrageart,empfaenger_email,empfaenger_emails,
    vorname,nachname,email,telefon,nachricht,datenschutz_bestaetigt)
  select thema,routing_schluessel,anfrageart,empfaenger_email,empfaenger_emails,
    vorname,nachname,email,telefon,nachricht,datenschutz_bestaetigt
  from jsonb_populate_record(null::public.contact_anfragen,p_contact) returning id into inquiry;
  allocation := public.allocate_event_teams(inquiry,p_club_name,p_teams,p_mode);
  if p_contact->>'thema' in ('event-bambini-weihnachten-2026','event-urmel-cup') then
    if p_contact ? 'team_time_slots' then
      select array_agg(slot order by slot) into preferences
      from jsonb_array_elements_text(p_contact->'team_time_slots') as slots(slot);
    else
      -- Compatible with an older Edge Function during deployment.
      preferences := array(select parts[1] from regexp_matches(
        substring(p_contact->>'nachricht' from 'Priorisierte Zeitfenster: ([^\r\n]+)'),
        '(09:00|12:00|15:00) Uhr', 'g') as matches(parts));
    end if;
    update public.event_team_registrations set preferred_time_slots = coalesce(preferences, '{}')
    where inquiry_id = inquiry;
  end if;
  return jsonb_build_object('id',inquiry,'allocations',allocation);
end $$;

create or replace function public.get_event_team_roster(p_event_topic text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('key',c.category,'label',c.label,'capacity',c.capacity,
    'waitingCapacity',c.waiting_capacity,'teams',coalesce((
      select jsonb_agg(jsonb_build_object('clubName',r.club_name,'teamNumber',r.team_number,
        'position',r.position,'status',r.status,
        'host',r.is_host or (c.category='Bambini' and r.club_key='bsv nordstern radolfzell'),
        'timeSlots',r.preferred_time_slots)
        order by (c.category='Bambini' and r.club_key='bsv nordstern radolfzell') desc,
          case when c.category='Bambini' and r.club_key='bsv nordstern radolfzell' then r.team_number end,
          r.position)
      from public.event_team_registrations r where r.event_topic=c.event_topic and r.category=c.category and r.mode='live'
    ),'[]'::jsonb)) order by c.sort_order),'[]'::jsonb)
  from public.event_team_categories c where c.event_topic=p_event_topic;
$$;
