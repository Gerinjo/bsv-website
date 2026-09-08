-- Hieu Ho moved from D3 to D1; retain any other configured D1 recipients.
update public.contact_empfaenger
set weitere_emails = array_append(weitere_emails, 'hieu.ho@bsvnordstern.de')
where schluessel = 'team--jugend--u13-d1'
  and lower(email) <> 'hieu.ho@bsvnordstern.de'
  and not exists (
    select 1 from unnest(weitere_emails) as recipient
    where lower(recipient) = 'hieu.ho@bsvnordstern.de'
  );

-- Confirmed D3 address; remove the former coach and duplicate primary address.
update public.contact_empfaenger
set email = 'jerome.ernsberger@bsvnordstern.de',
    weitere_emails = array(
      select recipient from unnest(weitere_emails) as recipient
      where lower(trim(recipient)) not in (
        'hieu.ho@bsvnordstern.de',
        'jerome.ernsberger@bsvnordstern.de'
      )
    )
where schluessel = 'team--jugend--u13-d3';
