-- Run after deploying the newsletter function and provisioning Vault secrets:
-- newsletter_function_url = https://<project>.supabase.co/functions/v1/newsletter
-- newsletter_worker_secret = the Edge secret NEWSLETTER_WORKER_SECRET
-- Never paste real keys into this file or commit them.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name = 'newsletter_function_url')
    or not exists(select 1 from vault.decrypted_secrets where name = 'newsletter_worker_secret') then
    raise exception 'Newsletter Vault secrets must be configured first';
  end if;
end;
$$;

select cron.schedule(
  'bsv-newsletter-workflow',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'newsletter_function_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'newsletter_worker_secret')
      ),
      body := '{"action":"process"}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);
