-- Managed pg_net queues can inherit provider grants. Send a payload signature,
-- never a reusable bridge key, through the transport.
create or replace function private.dispatch_trainer_suite_outbox() returns integer language plpgsql security invoker set search_path='' as $$
declare item private.trainer_suite_outbox;key text;request bigint;sent integer:=0;
begin
 if not pg_try_advisory_xact_lock(7041957) then return 0;end if;
 update private.trainer_suite_outbox o set delivered_at=now(),last_error=null from net._http_response r where r.id=o.request_id and o.delivered_at is null and r.status_code between 200 and 299 and r.content ~ '"ok"[[:space:]]*:[[:space:]]*true';
 select secret into key from private.trainer_suite_bridge where singleton;
 if key is null then return 0;end if;
 for item in select * from private.trainer_suite_outbox where accepted_at is not null and delivered_at is null and next_attempt_at<=now() order by created_at limit 20 for update skip locked loop
  request:=net.http_post(url:='https://maejihwjzxkmthjavgnx.supabase.co/functions/v1/trainer-onboarding-import',body:=item.profile,headers:=jsonb_build_object('Content-Type','application/json','X-BSV-Onboarding-Signature',encode(extensions.hmac(item.profile::text,encode(extensions.digest(key,'sha256'),'hex'),'sha256'),'hex')),timeout_milliseconds:=20000);
  update private.trainer_suite_outbox set request_id=request,attempts=attempts+1,next_attempt_at=now()+least(60,5*(attempts+1))*interval '1 minute',last_error=case when item.request_id is not null then 'Übernahme noch nicht bestätigt; automatischer Wiederholungsversuch.' else null end where reference=item.reference;
  sent:=sent+1;
 end loop;
 return sent;
end $$;
revoke all on function private.dispatch_trainer_suite_outbox() from public,anon,authenticated;
grant execute on function private.dispatch_trainer_suite_outbox() to service_role;

