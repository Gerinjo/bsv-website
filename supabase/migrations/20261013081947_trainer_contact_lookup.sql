-- Only the mail server can prepare a signature; the bridge key never leaves SQL.
create function public.prepare_trainer_contact_lookup(routing_key text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare key text; payload jsonb;
begin
 if routing_key is null or routing_key !~ '^(team--[a-z0-9-]+(--[a-z0-9-]+)*|person-[a-z0-9-]+)$' or length(routing_key)>160 then
  return jsonb_build_object('error','invalid_routing_key');
 end if;
 select secret into key from private.trainer_suite_bridge where singleton;
 if key is null then return jsonb_build_object('error','bridge_unavailable');end if;
 payload:=jsonb_build_object('purpose','trainer-contact','routingKey',routing_key,'requestedAt',clock_timestamp());
 return jsonb_build_object('payload',payload,'signature',encode(extensions.hmac(payload::text,encode(extensions.digest(key,'sha256'),'hex'),'sha256'),'hex'));
end $$;
revoke all on function public.prepare_trainer_contact_lookup(text) from public,anon,authenticated;
grant execute on function public.prepare_trainer_contact_lookup(text) to service_role;

alter table public.contact_anfragen add column empfaenger_emails text[] not null default '{}';
comment on column public.contact_anfragen.empfaenger_emails is 'Serverseitig bestimmte Empfänger zum Zeitpunkt der Anfrage';
alter table public.contact_anfragen drop constraint if exists contact_anfragen_empfaenger_email_check;
alter table public.contact_anfragen add constraint contact_anfragen_empfaenger_email_check check(char_length(trim(empfaenger_email)) between 5 and 254);
