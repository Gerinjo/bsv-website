alter table public.contact_anfragen
  add column gegner_verein text,
  add column gegner_mannschaft text;

alter table public.contact_anfragen
  add constraint contact_anfragen_gegner_verein_laenge check (
    gegner_verein is null
    or char_length(trim(gegner_verein)) between 2 and 160
  ),
  add constraint contact_anfragen_gegner_mannschaft_laenge check (
    gegner_mannschaft is null
    or char_length(trim(gegner_mannschaft)) between 1 and 100
  ),
  add constraint contact_anfragen_freundschaftsspiel_details check (
    anfrageart <> 'freundschaftsspiel'
    or (
      gegner_verein is not null
      and gegner_mannschaft is not null
      and char_length(trim(gegner_verein)) >= 2
      and char_length(trim(gegner_mannschaft)) >= 1
    )
  ) not valid;

comment on column public.contact_anfragen.gegner_verein is
  'Vereinsname des anfragenden Gegners bei Freundschaftsspielen';

comment on column public.contact_anfragen.gegner_mannschaft is
  'Mannschaftsbezeichnung des anfragenden Gegners bei Freundschaftsspielen';
