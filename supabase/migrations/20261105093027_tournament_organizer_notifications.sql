-- Keep organizer delivery independent of the applicant's confirmation.
-- Older registrations remain NULL; this does not resend old school registrations.
alter table public.gst_anmeldungen
  add column benachrichtigung_status text check (benachrichtigung_status in ('versendet', 'fehler')),
  add column mail_modus text check (mail_modus in ('test', 'live')),
  add column resend_id text,
  add column benachrichtigung_fehler text;
