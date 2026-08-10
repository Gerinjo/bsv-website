create policy "Kein direkter Zugriff auf Kontakt-Empfaenger"
  on public.contact_empfaenger
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Kein direkter Zugriff auf Kontaktanfragen"
  on public.contact_anfragen
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Kein direkter Zugriff auf Kontakt-Captchas"
  on public.contact_captcha_challenges
  for all
  to anon, authenticated
  using (false)
  with check (false);
