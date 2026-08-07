create table public.mcshape_anmeldungen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  vorname text not null check (char_length(trim(vorname)) between 2 and 80),
  nachname text not null check (char_length(trim(nachname)) between 2 and 80),
  geburtsdatum date not null,
  alter_bei_anfrage smallint not null check (alter_bei_anfrage between 0 and 120),
  email text not null check (char_length(trim(email)) between 5 and 160),
  telefon text not null check (char_length(trim(telefon)) between 6 and 40),

  interesse text not null check (char_length(trim(interesse)) between 2 and 160),
  bevorzugte_kontaktzeit text not null check (char_length(trim(bevorzugte_kontaktzeit)) between 2 and 80),

  bsv_mitglied_bestaetigt boolean not null check (bsv_mitglied_bestaetigt = true),
  rueckruf_einwilligung boolean not null check (rueckruf_einwilligung = true),
  datenschutz_bestaetigt boolean not null check (datenschutz_bestaetigt = true),

  benachrichtigung_status text not null default 'offen' check (
    benachrichtigung_status in ('offen', 'versendet', 'teilweise', 'fehler')
  ),
  bestaetigung_anfragende_person_versendet boolean not null default false
);

create index mcshape_anmeldungen_created_at_idx
  on public.mcshape_anmeldungen (created_at desc);

create index mcshape_anmeldungen_email_idx
  on public.mcshape_anmeldungen (lower(email));

alter table public.mcshape_anmeldungen enable row level security;
revoke all on table public.mcshape_anmeldungen from anon, authenticated;

comment on table public.mcshape_anmeldungen is
  'Anfragen von BSV-Mitgliedern zu den Kooperationskonditionen bei MC Shape Radolfzell';
