-- Run after the football_alerts migration. Secrets never leave the database.
-- This provisions credentials; activation is a separate step after a dry run.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
declare
  worker_token text;
  function_url constant text := 'https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/football-alerts';
begin
  select decrypted_secret into worker_token from vault.decrypted_secrets where name = 'football_alert_worker_secret';
  if worker_token is null then
    worker_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(worker_token, 'football_alert_worker_secret', 'Dedicated credential for the football alert cron worker');
  end if;
  if not exists(select 1 from vault.secrets where name = 'football_alert_function_url') then
    perform vault.create_secret(function_url, 'football_alert_function_url');
  end if;
  insert into public.football_alert_settings (id, worker_secret_sha256)
    values (true, encode(extensions.digest(worker_token, 'sha256'), 'hex'))
    on conflict (id) do update set worker_secret_sha256 = excluded.worker_secret_sha256, updated_at = now();
end;
$$;
