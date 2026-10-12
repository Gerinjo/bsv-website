-- A private durable outbox bridges successful website onboarding to the Suite.
create schema if not exists private;
grant usage on schema private to service_role;
create table private.trainer_suite_bridge (
 singleton boolean primary key default true check(singleton),secret text not null check(secret ~ '^[a-f0-9]{64}$')
);
create table private.trainer_suite_outbox (
 reference text primary key check(reference ~ '^TR-[0-9]{8}-[A-F0-9]{6}$'),profile jsonb not null,
 accepted_at timestamptz,delivered_at timestamptz,created_at timestamptz not null default now(),
 request_id bigint,attempts integer not null default 0,next_attempt_at timestamptz not null default now(),last_error text
);
create index trainer_suite_pending on private.trainer_suite_outbox(next_attempt_at) where accepted_at is not null and delivered_at is null;
alter table private.trainer_suite_bridge enable row level security;
alter table private.trainer_suite_outbox enable row level security;
revoke all on private.trainer_suite_bridge,private.trainer_suite_outbox from public,anon,authenticated;
grant select on private.trainer_suite_bridge to service_role;
grant select,insert,update on private.trainer_suite_outbox to service_role;
grant usage on schema net to service_role;
grant select on net._http_response to service_role;
grant execute on function net.http_post(text,jsonb,jsonb,jsonb,integer) to service_role;

create function private.dispatch_trainer_suite_outbox() returns integer language plpgsql security invoker set search_path='' as $$
declare item private.trainer_suite_outbox;key text;request bigint;sent integer:=0;
begin
 if not pg_try_advisory_xact_lock(7041957) then return 0;end if;
 update private.trainer_suite_outbox o set delivered_at=now(),last_error=null from net._http_response r where r.id=o.request_id and o.delivered_at is null and r.status_code between 200 and 299 and r.content ~ '"ok"[[:space:]]*:[[:space:]]*true';
 select secret into key from private.trainer_suite_bridge where singleton;
 if key is null then return 0;end if;
 for item in select * from private.trainer_suite_outbox where accepted_at is not null and delivered_at is null and next_attempt_at<=now() order by created_at limit 20 for update skip locked loop
  request:=net.http_post(url:='https://maejihwjzxkmthjavgnx.supabase.co/functions/v1/trainer-onboarding-import',body:=item.profile,headers:=jsonb_build_object('Content-Type','application/json','X-BSV-Onboarding-Secret',key),timeout_milliseconds:=20000);
  update private.trainer_suite_outbox set request_id=request,attempts=attempts+1,next_attempt_at=now()+least(60,5*(attempts+1))*interval '1 minute',last_error=case when item.request_id is not null then 'Übernahme noch nicht bestätigt; automatischer Wiederholungsversuch.' else null end where reference=item.reference;
  sent:=sent+1;
 end loop;
 return sent;
end $$;
revoke all on function private.dispatch_trainer_suite_outbox() from public,anon,authenticated;
grant execute on function private.dispatch_trainer_suite_outbox() to service_role;

create function public.trainer_suite_onboarding_queue(payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare ref text:=payload->>'applicationNumber';profile jsonb:=payload->'profile';act text:=payload->>'action';
begin
 if ref is null or ref !~ '^TR-[0-9]{8}-[A-F0-9]{6}$' then return jsonb_build_object('error','invalid_reference');end if;
 if act='prepare' then
  if jsonb_typeof(profile) is distinct from 'object' or length(profile::text)>8192 or profile->>'applicationNumber' is distinct from ref then return jsonb_build_object('error','invalid_profile');end if;
  insert into private.trainer_suite_outbox(reference,profile) values(ref,profile) on conflict(reference) do nothing;
 elsif act='accept' then
  update private.trainer_suite_outbox set accepted_at=coalesce(accepted_at,now()) where reference=ref;
  if not found then return jsonb_build_object('error','profile_not_prepared');end if;
  -- Keep acceptance durable even if dispatch is temporarily unavailable.
  begin perform private.dispatch_trainer_suite_outbox();exception when others then null;end;
 else return jsonb_build_object('error','invalid_action');end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.trainer_suite_onboarding_queue(jsonb) from public,anon,authenticated;
grant execute on function public.trainer_suite_onboarding_queue(jsonb) to service_role;
select cron.schedule('trainer-suite-onboarding','*/5 * * * *','select private.dispatch_trainer_suite_outbox();');
