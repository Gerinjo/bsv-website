-- Route future Alte-Herren contact requests to the mailbox confirmed by the club.
update public.contact_empfaenger
set email = 'alte.herren@bsvnordstern.de'
where schluessel = 'team--fussball--alte-herren';
