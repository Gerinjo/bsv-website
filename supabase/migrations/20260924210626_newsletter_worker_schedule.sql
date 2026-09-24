-- Schedule retries when deployment-specific Vault secrets are available.
-- For a fresh environment, provision the secrets and run setup/newsletter-worker.sql.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $migration$
begin
  if exists(select 1 from vault.secrets where name = 'newsletter_function_url')
    and exists(select 1 from vault.secrets where name = 'newsletter_worker_secret') then
perform cron.schedule(
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

  else
    raise notice 'Newsletter worker secrets missing; run setup/newsletter-worker.sql after provisioning them.';
  end if;
end;
$migration$;
