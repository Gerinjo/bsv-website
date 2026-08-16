alter table public.contact_empfaenger
  add column weitere_emails text[] not null default '{}'::text[]
  check (cardinality(weitere_emails) <= 20);

comment on column public.contact_empfaenger.weitere_emails is
  'Weitere aktive Empfaengeradressen fuer denselben Routing-Schluessel; nur serverseitig lesbar';

update public.contact_empfaenger
set weitere_emails = case schluessel
  when 'team--fussball--frauen--kreisliga' then array['emel.bayram@bsvnordstern.de']
  when 'team--jugend--u6-g' then array['noemi.friedrich@bsvnordstern.de', 'mila.ernsberger@bsvnordstern.de']
  when 'team--jugend--u7-g' then array['marco.tassone@bsvnordstern.de', 'luca.gastaudo@bsvnordstern.de']
  when 'team--jugend--u8-f' then array['fabian.keller@bsvnordstern.de']
  when 'team--jugend--u9-f' then array['marcelino.rueth@bsvnordstern.de']
  when 'team--jugend--u11-e2' then array['mohamad.mahmoudi@bsvnordstern.de']
  when 'team--jugend--u11-e3' then array['michael.sick@bsvnordstern.de']
  when 'team--jugend--u13-d2' then array['marco.eisner@bsvnordstern.de']
  when 'team--jugend--u15-c1' then array['simon.buehler@bsvnordstern.de', 'thomas.parthenschlager@bsvnordstern.de']
  when 'team--jugend--u17' then array['andrea.basile@bsvnordstern.de']
  when 'team--jugend--u19' then array['schmal.ole@gmail.com', 'u13trainer@sv-markelfingen.de']
  when 'team--jugend--juniorinnen--u17' then array['sonja.thomen@bsvnordstern.de']
  else weitere_emails
end
where schluessel in (
  'team--fussball--frauen--kreisliga',
  'team--jugend--u6-g',
  'team--jugend--u7-g',
  'team--jugend--u8-f',
  'team--jugend--u9-f',
  'team--jugend--u11-e2',
  'team--jugend--u11-e3',
  'team--jugend--u13-d2',
  'team--jugend--u15-c1',
  'team--jugend--u17',
  'team--jugend--u19',
  'team--jugend--juniorinnen--u17'
);

update public.contact_empfaenger
set email = 'hieu.ho@bsvnordstern.de'
where schluessel = 'team--jugend--u13-d3';

update public.contact_empfaenger
set email = '1.vorstand@sv-markelfingen.de'
where schluessel = 'team--jugend--u19';
