create table public.contact_empfaenger (
  schluessel text primary key check (schluessel ~ '^[a-z0-9-]+(--[a-z0-9-]+)*$'),
  bezeichnung text not null check (char_length(trim(bezeichnung)) between 2 and 160),
  email text not null check (
    char_length(trim(email)) between 5 and 160
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  aktiv boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.contact_anfragen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  thema text not null check (char_length(trim(thema)) between 2 and 200),
  routing_schluessel text not null,
  anfrageart text not null check (anfrageart in ('kontakt', 'probetraining', 'freundschaftsspiel')),
  empfaenger_email text not null check (char_length(trim(empfaenger_email)) between 5 and 160),

  vorname text not null check (char_length(trim(vorname)) between 2 and 80),
  nachname text not null check (char_length(trim(nachname)) between 2 and 80),
  email text not null check (char_length(trim(email)) between 5 and 160),
  telefon text check (telefon is null or char_length(trim(telefon)) between 6 and 40),
  nachricht text not null check (char_length(trim(nachricht)) between 10 and 5000),
  datenschutz_bestaetigt boolean not null check (datenschutz_bestaetigt = true),

  benachrichtigung_status text not null default 'offen' check (
    benachrichtigung_status in ('offen', 'versendet', 'fehler')
  ),
  mail_modus text check (mail_modus is null or mail_modus in ('test', 'live')),
  resend_id text,
  benachrichtigung_fehler text,

  constraint contact_anfragen_empfaenger_fk
    foreign key (routing_schluessel) references public.contact_empfaenger (schluessel)
);

create table public.contact_captcha_challenges (
  id uuid primary key default gen_random_uuid(),
  antwort smallint not null check (antwort between 2 and 18),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index contact_anfragen_created_at_idx
  on public.contact_anfragen (created_at desc);

create index contact_anfragen_status_idx
  on public.contact_anfragen (benachrichtigung_status, created_at desc);

create index contact_captcha_expires_at_idx
  on public.contact_captcha_challenges (expires_at);

create or replace function public.set_contact_empfaenger_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contact_empfaenger_updated_at
before update on public.contact_empfaenger
for each row execute function public.set_contact_empfaenger_updated_at();

alter table public.contact_empfaenger enable row level security;
alter table public.contact_anfragen enable row level security;
alter table public.contact_captcha_challenges enable row level security;

revoke all on table public.contact_empfaenger from anon, authenticated;
revoke all on table public.contact_anfragen from anon, authenticated;
revoke all on table public.contact_captcha_challenges from anon, authenticated;
revoke all on function public.set_contact_empfaenger_updated_at() from public, anon, authenticated;

grant select on table public.contact_empfaenger to service_role;
grant select, insert, update on table public.contact_anfragen to service_role;
grant select, insert, delete on table public.contact_captcha_challenges to service_role;

comment on table public.contact_empfaenger is
  'Serverseitige Zuordnung der Kontaktformular-Themen zu den zuständigen E-Mail-Adressen';
comment on table public.contact_anfragen is
  'Kontaktanfragen der Website inklusive Status der E-Mail-Benachrichtigung';
comment on table public.contact_captcha_challenges is
  'Kurzlebige, einmal nutzbare Rechenaufgaben für das öffentliche Kontaktformular';

insert into public.contact_empfaenger (schluessel, bezeichnung, email) values
  ('general', 'Allgemeine Themen (Vorstandschaft)', 'info@bsvnordstern.de'),
  ('membership', 'Mitgliederverwaltung', 'verwaltung@bsvnordstern.de'),
  ('youth', 'Jugendleitung', 'jugend@bsvnordstern.de'),
  ('sponsoring', 'Sponsoring', 'sponsoring@bsvnordstern.de'),
  ('social', 'Social Media', 'socialmedia@bsvnordstern.de'),
  ('finance', 'Kasse', 'kasse@bsvnordstern.de'),
  ('match-operations', 'Spielbetrieb', 'Oliver.Schillinger@bsvnordstern.de'),
  ('passwesen', 'Passwesen', 'passwesen@bsvnordstern.de'),
  ('referees', 'Schiedsrichterwesen', 'Stefan.Gastaudo@bsvnordstern.de'),
  ('archery', 'Bogensport', 'Konrad.Mauz@bsvnordstern.de'),
  ('gymnastics', 'Gymnastik', 'Heike.Seidel@bsvnordstern.de'),
  ('hiking', 'Wandergruppe', 'Thomas.Graf@bsvnordstern.de'),
  ('team--fussball--herren--bezirksliga', 'Herren 1', 'Torsten.Parzich@bsvnordstern.de'),
  ('team--fussball--herren--kreisliga-2', 'Herren 2', 'Alexander.Kaiser@bsvnordstern.de'),
  ('team--fussball--frauen--bezirksliga', 'SG Frauen 1', 'Mathias.Becht@bsvnordstern.de'),
  ('team--fussball--frauen--kreisliga', 'SG Frauen 2', 'Myriam.Lipp@bsvnordstern.de'),
  ('team--fussball--alte-herren', 'Alte Herren', 'alteherren@bsvnordstern.de'),
  ('team--jugend--u11-e1', 'E1-Junioren', 'niku.pourheidari@bsvnordstern.de'),
  ('team--jugend--u11-e2', 'E2-Junioren', 'marcelino.rueth@bsvnordstern.de'),
  ('team--jugend--u11-e3', 'E3-Junioren', 'stefan.sulger@bsvnordstern.de'),
  ('team--jugend--u9-f', 'F1-Junioren', 'andy.wolfmueller@bsvnordstern.de'),
  ('team--jugend--u8-f', 'F2-Junioren', 'pascal.dieterle@bsvnordstern.de'),
  ('team--jugend--u7-g', 'G1-Junioren', 'michael.meiss@bsvnordstern.de'),
  ('team--jugend--u6-g', 'G2-Junioren', 'elias.arfa@bsvnordstern.de'),
  ('team--jugend--u19', 'A-Junioren', 'jugend@bsvnordstern.de'),
  ('team--jugend--u17', 'B-Junioren', 'maxgeissmann@gmail.com'),
  ('team--jugend--u15-c1', 'C1-Junioren', 'axel.schaeuble@bsvnordstern.de'),
  ('team--jugend--u15-c2', 'C2-Junioren', 'sebastian.baeuerle@bsvnordstern.de'),
  ('team--jugend--u13-d1', 'D1-Junioren', 'stephan.hellmann@bsvnordstern.de'),
  ('team--jugend--u13-d2', 'D2-Junioren', 'joerg.boreatti@bsvnordstern.de'),
  ('team--jugend--u13-d3', 'D3-Junioren', 'jugend@bsvnordstern.de'),
  ('team--jugend--juniorinnen--u17', 'B-Juniorinnen', 'sven.goldhagen@bsvnordstern.de'),
  ('team--jugend--juniorinnen--u15', 'C-Juniorinnen', 'alexander.kramer@bsvnordstern.de'),
  ('team--jugend--juniorinnen--u13', 'D-Juniorinnen', 'dana.bulander@bsvnordstern.de');
