insert into public.contact_empfaenger (schluessel, bezeichnung, email)
values
  ('youth-leadership', 'Jugendleitung', 'jugend@bsvnordstern.de'),
  ('youth-parents', 'Elternvertretung', 'Sarah.Klumpp@bsvnordstern.de'),
  ('youth-finance', 'Jugendkasse (Wiebke Baronner-Dieterle)', 'Jugendkasse@bsvnordstern.de')
on conflict (schluessel) do update
set
  bezeichnung = excluded.bezeichnung,
  email = excluded.email,
  aktiv = true;
