-- Remember handled applications, including those already subscribed/pending.
-- A repeated mail-bridge call must never undo a later unsubscribe.
create table public.newsletter_membership_requests (
  subscription_id uuid not null references public.newsletter_subscriptions(id) on delete cascade,
  application_number text not null,
  created_at timestamptz not null default now(),
  primary key (subscription_id, application_number)
);
alter table public.newsletter_membership_requests enable row level security;
revoke all on public.newsletter_membership_requests from public, anon, authenticated;
grant select, insert, update, delete on public.newsletter_membership_requests to service_role;
create policy newsletter_membership_requests_private on public.newsletter_membership_requests
  for all to anon, authenticated using (false) with check (false);

create function public.newsletter_request_membership(
  p_email text, p_mode text, p_token_hash text, p_message jsonb,
  p_consent_version text, p_application_number text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare sub public.newsletter_subscriptions; job_id uuid; result_status text;
begin
  if p_application_number is null or p_application_number !~ '^BSV-[0-9]{8}-[0-9]{6}-[A-F0-9]{4}$' then
    raise exception 'invalid_membership_reference';
  end if;
  -- Use the same lock as homepage requests; keep all checks and enqueue atomic.
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_email, 0));
  select * into sub from public.newsletter_subscriptions where email = p_email and mail_mode = p_mode for update;
  if found then
    if exists(select 1 from public.newsletter_membership_requests where subscription_id = sub.id and application_number = p_application_number) then
      return jsonb_build_object('status', 'already_requested');
    end if;
    if sub.status = 'confirmed' then
      result_status := 'already_confirmed';
    elsif not sub.token_consumed and sub.confirmation_expires_at > now()
       and exists(select 1 from public.newsletter_jobs where subscription_id = sub.id and kind = 'confirmation'
         and created_at >= sub.requested_at and status in ('pending', 'processing', 'sent')) then
      result_status := 'pending';
    end if;
  end if;
  -- PHP has already validated its own single-use captcha. Reuse the per-email
  -- cooldown and daily limit, without sharing one IP quota across all members.
  if result_status is null then
    job_id := public.newsletter_request(p_email, p_mode, p_token_hash, p_message, p_consent_version,
      'membership:' || p_mode || ':' || p_application_number);
    if job_id is null then return jsonb_build_object('status', 'unavailable'); end if;
    select * into sub from public.newsletter_subscriptions where email = p_email and mail_mode = p_mode;
    result_status := 'queued';
  end if;
  insert into public.newsletter_membership_requests(subscription_id, application_number) values(sub.id, p_application_number);
  return jsonb_build_object('status', result_status);
end;
$$;
revoke all on function public.newsletter_request_membership(text,text,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.newsletter_request_membership(text,text,text,jsonb,text,text) to service_role;
