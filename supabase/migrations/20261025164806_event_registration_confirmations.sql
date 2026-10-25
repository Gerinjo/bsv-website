-- Applicant confirmations are independent of internal organizer notifications.
-- NULL marks older records and non-event contact messages; there is no retrospective send.
alter table public.contact_anfragen
  add column bestaetigung_status text check (bestaetigung_status in ('versendet', 'fehler')),
  add column bestaetigung_mail_modus text check (bestaetigung_mail_modus in ('test', 'live')),
  add column bestaetigung_resend_id text,
  add column bestaetigung_fehler text;

alter table public.gst_anmeldungen
  add column bestaetigung_status text check (bestaetigung_status in ('versendet', 'fehler')),
  add column bestaetigung_mail_modus text check (bestaetigung_mail_modus in ('test', 'live')),
  add column bestaetigung_resend_id text,
  add column bestaetigung_fehler text;
