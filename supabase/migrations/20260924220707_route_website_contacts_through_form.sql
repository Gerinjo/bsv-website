-- Preserve the recipients of existing public email links behind the contact form.
-- No change to table permissions or the captcha-protected contact endpoint.
insert into public.contact_empfaenger (schluessel, bezeichnung, email)
values
  ('foerderverein', 'Förderverein', 'foerderverein@bsvnordstern.de'),
  ('goalkeeping', 'Torwarttraining · Stefan Gastaudo', 'Stefan.Gastaudo@bsvnordstern.de'),
  ('person-sandra-fuchs', 'Sandra Fuchs · 1. Vorstand', 'Sandra.Fuchs@bsvnordstern.de'),
  ('person-felix-schuele', 'Felix Schüle · 2. Vorstand / Herren', 'Felix.Schuele@bsvnordstern.de'),
  ('person-michaela-auer', 'Michaela Auer · Schriftführerin', 'Michaela.Auer@bsvnordstern.de'),
  ('person-ann-kathrin-sugg', 'Ann-Kathrin Sugg · Frauenfußball', 'Ann-Kathrin.Sugg@bsvnordstern.de'),
  ('person-karsten-grammel', 'Karsten Grammel · Alte Herren', 'alte.herren@bsvnordstern.de'),
  ('person-jerome-ernsberger', 'Jérôme Ernsberger · IT & Jugend', 'Jerome.Ernsberger@bsvnordstern.de'),
  ('person-markus-sawicki', 'Markus Sawicki · Einkauf & Organisation', 'Markus.Sawicki@bsvnordstern.de'),
  ('person-julian-kemmer', 'Julian Kemmer · Presse', 'Julian.Kemmer@bsvnordstern.de'),
  ('person-mario-jost', 'Mario Jost · Platzwart', 'Mario.Jost@bsvnordstern.de'),
  ('person-eberhard-klinkenberg', 'Eberhard Klinkenberg · Hausmeister', 'Eberhard.Klinkenberg@bsvnordstern.de'),
  ('person-markus-mossbrugger', 'Markus Moßbrugger · Schlüsselmanagement', 'Markus.Mossbrugger@bsvnordstern.de'),
  ('person-ole-schmal', 'Ole Schmal', 'Ole.Schmal@bsvnordstern.de'),
  ('person-monika-peglau', 'Monika Peglau · Kinderschutz', 'kinderschutz@bsvnordstern.de'),
  ('person-susi-eisner', 'Susi Eisner', 'Susi.Eisner@bsvnordstern.de'),
  ('person-wiebke-baronner-dieterle', 'Wiebke Baronner-Dieterle', 'Wiebke.Baronner-Dieterle@bsvnordstern.de'),
  ('person-tobias-messmer', 'Tobias Messmer', 'Tobias.Messmer@bsvnordstern.de'),
  ('person-peter-weidele', 'Peter Weidele · Wandergruppe', 'Peter.Weidele@t-online.de')
on conflict (schluessel) do update
set bezeichnung = excluded.bezeichnung, email = excluded.email, aktiv = true;
