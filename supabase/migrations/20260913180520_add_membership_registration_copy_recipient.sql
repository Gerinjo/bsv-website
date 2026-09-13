insert into public.contact_empfaenger (schluessel, bezeichnung, email, aktiv)
values (
  'membership-registration-copy',
  'Kopie Neuanmeldungen: Jerome Ernsberger',
  'jerome.ernsberger@bsvnordstern.de',
  true
)
on conflict (schluessel) do update
set email = excluded.email,
    aktiv = excluded.aktiv;
