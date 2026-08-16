insert into public.contact_empfaenger (schluessel, bezeichnung, email)
values ('foerderverein', 'Förderverein', 'foerderverein@bsvnordstern.de')
on conflict (schluessel) do update
set bezeichnung = excluded.bezeichnung,
    email = excluded.email,
    aktiv = true,
    updated_at = now();

create table public.foerderverein_antraege (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  antragsnummer text not null unique check (antragsnummer ~ '^FV-[0-9]{8}-[A-Z0-9]{6}$'),
  vorname text not null check (char_length(trim(vorname)) between 2 and 80),
  nachname text not null check (char_length(trim(nachname)) between 2 and 80),
  email text not null check (char_length(trim(email)) between 5 and 160),
  bsv_mitglied boolean not null,
  foerderbetrag numeric(8,2) not null check (foerderbetrag >= 11 and foerderbetrag <= 10000),
  empfaenger_email text not null check (char_length(trim(empfaenger_email)) between 5 and 160),
  benachrichtigung_status text not null default 'offen' check (benachrichtigung_status in ('offen', 'versendet', 'fehler')),
  bestaetigung_status text not null default 'offen' check (bestaetigung_status in ('offen', 'versendet', 'fehler')),
  mail_modus text check (mail_modus is null or mail_modus in ('test', 'live')),
  resend_id text,
  bestaetigung_resend_id text,
  benachrichtigung_fehler text
);

create index foerderverein_antraege_created_at_idx
  on public.foerderverein_antraege (created_at desc);

alter table public.foerderverein_antraege enable row level security;
revoke all on table public.foerderverein_antraege from anon, authenticated;
grant select, insert, update on table public.foerderverein_antraege to service_role;

comment on table public.foerderverein_antraege is
  'Minimales Versandprotokoll der Online-Förderanträge; Bankdaten, Adresse, Geburtstag und Unterschrift werden nicht dauerhaft gespeichert';
