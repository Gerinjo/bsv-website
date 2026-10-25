-- Only the Edge Function may access these tables and RPCs. Public rosters expose team names only.
create table public.event_team_categories (
  event_topic text not null,
  category text not null,
  label text not null,
  sort_order integer not null,
  capacity integer check (capacity > 0),
  waiting_capacity integer not null default 0 check (waiting_capacity >= 0),
  primary key (event_topic, category)
);
create table public.event_team_registrations (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.contact_anfragen(id) on delete cascade,
  event_topic text not null,
  category text not null,
  mode text not null check (mode in ('live', 'test')),
  club_name text not null check (length(club_name) between 2 and 160),
  club_key text generated always as (lower(btrim(club_name))) stored,
  team_number integer not null check (team_number > 0),
  position integer not null check (position > 0),
  status text not null check (status in ('confirmed', 'waiting')),
  is_host boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (event_topic, category) references public.event_team_categories(event_topic, category),
  unique (event_topic, category, mode, position),
  unique (event_topic, category, mode, club_key, team_number),
  check (not is_host or (inquiry_id is null and position = 1 and status = 'confirmed'))
);
create index event_team_registrations_inquiry_idx on public.event_team_registrations(inquiry_id);
alter table public.event_team_categories enable row level security;
alter table public.event_team_registrations enable row level security;
revoke all on public.event_team_categories, public.event_team_registrations from public, anon, authenticated;
grant select on public.event_team_categories to service_role;
grant select, insert, update, delete on public.event_team_registrations to service_role;

insert into public.event_team_categories values
 ('event-bodensee-indoor-girls-cup','E','E-Juniorinnen',1,8,2),
 ('event-bodensee-indoor-girls-cup','D','D-Juniorinnen',2,8,2),
 ('event-bodensee-indoor-girls-cup','C','C-Juniorinnen',3,8,2),
 ('event-bodensee-indoor-girls-cup','B','B-Juniorinnen',4,8,2),
 ('event-bambini-weihnachten-2026','Bambini','Bambini',1,null,0),
 ('event-urmel-cup','Bambini','Bambini',1,null,0);
-- A test registration never consumes or appears among live tournament places.
insert into public.event_team_registrations(event_topic,category,mode,club_name,team_number,position,status,is_host)
select event_topic,category,mode,'BSV Nordstern Radolfzell',1,1,'confirmed',true
from public.event_team_categories cross join (values ('live'),('test')) modes(mode);

create function public.allocate_event_teams(p_inquiry_id uuid, p_club_name text, p_teams jsonb, p_mode text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  event_key text; selection jsonb; config public.event_team_categories; slot integer;
  next_number integer; requested integer; n integer; result jsonb;
begin
  select thema into strict event_key from public.contact_anfragen where id=p_inquiry_id;
  if p_mode not in ('live','test') or length(btrim(p_club_name)) not between 2 and 160
    or jsonb_typeof(p_teams) <> 'array' or jsonb_array_length(p_teams) not between 1 and 4 then
    raise exception 'Invalid event registration' using errcode='22023';
  end if;
  if (select count(*) from jsonb_array_elements(p_teams)) <>
     (select count(distinct item->>'division') from jsonb_array_elements(p_teams) item) then
    raise exception 'Duplicate category' using errcode='22023';
  end if;
  -- All requested categories are locked in one stable order. No network or mail work holds these locks.
  perform 1 from public.event_team_categories c where c.event_topic=event_key
    and c.category in (select item->>'division' from jsonb_array_elements(p_teams) item)
    order by c.category for update;
  if (select count(*) from public.event_team_categories c where c.event_topic=event_key
      and c.category in (select item->>'division' from jsonb_array_elements(p_teams) item)) <> jsonb_array_length(p_teams) then
    raise exception 'Unknown category' using errcode='22023';
  end if;
  if not exists(select 1 from public.event_team_registrations where inquiry_id=p_inquiry_id) then
    for selection in select item from jsonb_array_elements(p_teams) item order by item->>'division' loop
      select * into strict config from public.event_team_categories where event_topic=event_key and category=selection->>'division';
      requested := (selection->>'count')::integer;
      if requested not between 1 and 99 then raise exception 'Invalid team count' using errcode='22023'; end if;
      for n in 1..requested loop
        if config.capacity is null then
          select coalesce(max(position),0)+1 into slot from public.event_team_registrations
            where event_topic=event_key and category=config.category and mode=p_mode;
        else
          select candidate into slot from generate_series(1,config.capacity+config.waiting_capacity) candidate
            where not exists(select 1 from public.event_team_registrations r
              where r.event_topic=event_key and r.category=config.category and r.mode=p_mode and r.position=candidate)
            order by candidate limit 1;
          if slot is null then
            raise exception 'EVENT_FULL:%',config.label using errcode='P0001';
          end if;
        end if;
        select coalesce(max(team_number),0)+1 into next_number from public.event_team_registrations
          where event_topic=event_key and category=config.category and mode=p_mode and club_key=lower(btrim(p_club_name));
        insert into public.event_team_registrations(inquiry_id,event_topic,category,mode,club_name,team_number,position,status)
        values(p_inquiry_id,event_key,config.category,p_mode,btrim(p_club_name),next_number,slot,
          case when config.capacity is null or slot<=config.capacity then 'confirmed' else 'waiting' end);
      end loop;
    end loop;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('category',category,'clubName',club_name,'teamNumber',team_number,
    'position',position,'status',status) order by category,position),'[]'::jsonb) into result
    from public.event_team_registrations where inquiry_id=p_inquiry_id;
  return result;
end $$;

create function public.submit_event_registration(p_contact jsonb, p_club_name text, p_teams jsonb, p_mode text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare inquiry uuid; allocation jsonb;
begin
  insert into public.contact_anfragen(thema,routing_schluessel,anfrageart,empfaenger_email,empfaenger_emails,
    vorname,nachname,email,telefon,nachricht,datenschutz_bestaetigt)
  select thema,routing_schluessel,anfrageart,empfaenger_email,empfaenger_emails,
    vorname,nachname,email,telefon,nachricht,datenschutz_bestaetigt
  from jsonb_populate_record(null::public.contact_anfragen,p_contact) returning id into inquiry;
  allocation := public.allocate_event_teams(inquiry,p_club_name,p_teams,p_mode);
  return jsonb_build_object('id',inquiry,'allocations',allocation);
end $$;

create function public.get_event_team_roster(p_event_topic text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('key',c.category,'label',c.label,'capacity',c.capacity,
    'waitingCapacity',c.waiting_capacity,'teams',coalesce((
      select jsonb_agg(jsonb_build_object('clubName',r.club_name,'teamNumber',r.team_number,
        'position',r.position,'status',r.status,'host',r.is_host) order by r.position)
      from public.event_team_registrations r where r.event_topic=c.event_topic and r.category=c.category and r.mode='live'
    ),'[]'::jsonb)) order by c.sort_order),'[]'::jsonb)
  from public.event_team_categories c where c.event_topic=p_event_topic;
$$;
revoke all on function public.allocate_event_teams(uuid,text,jsonb,text),
  public.submit_event_registration(jsonb,text,jsonb,text),public.get_event_team_roster(text) from public,anon,authenticated;
grant execute on function public.allocate_event_teams(uuid,text,jsonb,text),
  public.submit_event_registration(jsonb,text,jsonb,text),public.get_event_team_roster(text) to service_role;

-- Import existing live registrations in arrival order without sending any email.
do $$
declare inquiry record; club text; teams jsonb;
begin
 for inquiry in select id,thema,nachricht from public.contact_anfragen
   where thema in ('event-bodensee-indoor-girls-cup','event-bambini-weihnachten-2026','event-urmel-cup')
     and coalesce(mail_modus,bestaetigung_mail_modus)='live' order by created_at,id loop
   club := (regexp_match(inquiry.nachricht,E'(?:^|\n)Verein: ([^\n\r]+)'))[1];
   if club is null then raise exception 'Missing club in existing registration %',inquiry.id; end if;
   if inquiry.thema='event-bodensee-indoor-girls-cup' then
     select jsonb_agg(jsonb_build_object('division',parts[1],'count',parts[2]::integer)) into teams
     from regexp_matches(split_part(inquiry.nachricht,'Anmerkungen:',1),'[ \t]*([EDCB])-Juniorinnen: ([0-9]+) Team','g') parts;
   else teams := '[{"division":"Bambini","count":1}]'::jsonb;
   end if;
   if teams is null then raise exception 'Missing teams in existing registration %',inquiry.id; end if;
   perform public.allocate_event_teams(inquiry.id,club,teams,'live');
 end loop;
end $$;
