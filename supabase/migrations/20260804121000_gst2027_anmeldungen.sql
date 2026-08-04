create type public.gst_anmeldung_status as enum (
  'neu',
  'bestaetigt',
  'warteliste',
  'abgesagt'
);

create table public.gst_anmeldungen (
  id uuid primary key default gen_random_uuid(),
  veranstaltung text not null default 'gst2027' check (veranstaltung = 'gst2027'),
  created_at timestamptz not null default now(),

  vorname text not null check (char_length(trim(vorname)) between 1 and 80),
  nachname text not null check (char_length(trim(nachname)) between 1 and 80),
  email text not null check (char_length(trim(email)) between 5 and 200),
  telefon text not null check (char_length(trim(telefon)) between 3 and 50),

  grundschule text not null check (char_length(trim(grundschule)) between 2 and 140),
  altersklasse text not null check (altersklasse in (
    'Mix 1. & 2. Klasse',
    'Mädchen 1. & 2. Klasse',
    'Mix 3. & 4. Klasse',
    'Mädchen 3. & 4. Klasse'
  )),
  mannschaftsname text not null check (char_length(trim(mannschaftsname)) between 1 and 120),
  weitere_informationen text check (weitere_informationen is null or char_length(weitere_informationen) <= 1500),

  beteiligung_bestaetigt boolean not null check (beteiligung_bestaetigt = true),
  datenschutz_bestaetigt boolean not null check (datenschutz_bestaetigt = true),
  status public.gst_anmeldung_status not null default 'neu'
);

create unique index gst2027_doppelanmeldung_idx
on public.gst_anmeldungen (
  lower(grundschule),
  lower(altersklasse),
  lower(mannschaftsname)
)
where veranstaltung = 'gst2027';

alter table public.gst_anmeldungen enable row level security;
revoke all on table public.gst_anmeldungen from anon, authenticated;

comment on table public.gst_anmeldungen is 'Mannschaftsanmeldungen für das Zeller Grundschulturnier 2027';
