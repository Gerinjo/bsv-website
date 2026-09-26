-- Only run after the deployed function has passed an authenticated dry run.
-- User-authorized operational warnings; does not change the global email mode.
begin;
update public.football_alert_settings set enabled = true, updated_at = now() where id = true;
select cron.schedule(
  'bsv-football-alerts',
  '0 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'football_alert_function_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'football_alert_worker_secret')
      ),
      body := '{"action":"run"}'::jsonb,
      timeout_milliseconds := 140000
    );
  $job$
);
commit;
