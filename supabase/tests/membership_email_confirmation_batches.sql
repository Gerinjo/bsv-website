-- Run after all newsletter migrations. Synthetic records are rolled back.
begin;
set local role service_role;
do $$
declare r jsonb; first_batch uuid; n_hash text; i_hash text; n_id uuid; i_id uuid; job uuid;
begin
 r:=public.newsletter_request_membership_topics('batch-check@example.org','test',repeat('a',64),'{}','choices-v1','BSV-20260925-150000-AA01',array['newsletter','club_info']);
 assert r->>'status'='queued';
 select id into first_batch from public.newsletter_confirmation_batches where token_hash=repeat('a',64);
 assert (select count(*)=2 from public.newsletter_confirmation_items where batch_id=first_batch);
 assert (select count(*)=1 from public.newsletter_jobs where confirmation_batch_id=first_batch and kind='confirmation');
 assert not exists(select 1 from public.newsletter_subscriptions where email='batch-check@example.org' and status='confirmed');
 r:=public.newsletter_request_membership_topics('batch-check@example.org','test',repeat('b',64),'{}','choices-v1','BSV-20260925-150000-AA01',array['newsletter','club_info']);
 assert r->>'status'='already_requested';
 r:=public.newsletter_request_membership_topics('batch-check@example.org','test',repeat('b',64),'{}','choices-v1','BSV-20260925-150001-AA02',array['newsletter','club_info']);
 assert r->>'status'='pending';
 assert (select count(*)=1 from public.newsletter_jobs where confirmation_batch_id=first_batch);
 r:=public.newsletter_confirm_batch(repeat('a',64),'live',jsonb_build_object('newsletter',repeat('c',64),'club_info',repeat('d',64)),'{}');
 assert r->>'status'='invalid','test link cannot activate live subscriptions';
 r:=public.newsletter_confirm_batch(repeat('a',64),'test',jsonb_build_object('newsletter',repeat('c',64),'club_info',repeat('d',64)),'{}');
 assert r->>'status'='confirmed';
 assert (select count(*)=2 from public.newsletter_subscriptions where email='batch-check@example.org' and status='confirmed');
 assert (select count(*)=1 from public.newsletter_jobs where confirmation_batch_id=first_batch and kind='welcome');
 r:=public.newsletter_confirm_batch(repeat('a',64),'test','{}',null);
 assert r->>'status'='already_confirmed';
 assert (select count(*)=1 from public.newsletter_jobs where confirmation_batch_id=first_batch and kind='welcome');
 -- Independent opt-out leaves the shared welcome queued for the other list's sync.
 r:=public.newsletter_unsubscribe(repeat('d',64),'test');
 assert r->>'status'='unsubscribed';
 assert (select status='confirmed' from public.newsletter_subscriptions where email='batch-check@example.org' and topic='newsletter');
 assert (select status='pending' from public.newsletter_jobs where confirmation_batch_id=first_batch and kind='welcome');
 r:=public.newsletter_confirm_batch(repeat('a',64),'test','{}',null);
 assert r->>'status'='invalid','old combined link cannot undo an opt-out';
 r:=public.newsletter_request_membership_topics('batch-check@example.org','test',repeat('b',64),'{}','choices-v1','BSV-20260925-150000-AA01',array['club_info']);
 assert r->>'status'='already_requested';
 assert (select status='unsubscribed' from public.newsletter_subscriptions where email='batch-check@example.org' and topic='club_info');
 -- Selecting both again only requests verification of the currently missing offer.
 r:=public.newsletter_request_membership_topics('batch-check@example.org','test',repeat('e',64),'{}','choices-v2','BSV-20260925-150002-AA03',array['newsletter','club_info']);
 assert r->>'status'='queued';
 assert (select topics=array['club_info']::text[] from public.newsletter_confirmation_batches where token_hash=repeat('e',64));
 r:=public.newsletter_confirm_batch(repeat('e',64),'test',jsonb_build_object('club_info',repeat('f',64)),'{}');
 assert r->>'status'='confirmed';
 assert (select unsubscribe_token_hash=repeat('c',64) from public.newsletter_subscriptions where email='batch-check@example.org' and topic='newsletter');
 r:=public.newsletter_request_membership_topics('batch-check@example.org','test',repeat('b',64),'{}','choices-v2','BSV-20260925-150003-AA04',array['newsletter','club_info']);
 assert r->>'status'='already_confirmed';
 -- Info-only application must never create a newsletter subscription.
 r:=public.newsletter_request_membership_topics('only-info-check@example.org','test',repeat('1',64),'{}','choices-v1','BSV-20260925-150004-AA05',array['club_info']);
 assert r->>'status'='queued';
 assert not exists(select 1 from public.newsletter_subscriptions where email='only-info-check@example.org' and topic='newsletter');
 update public.newsletter_confirmation_batches set expires_at=now()-interval '1 minute' where token_hash=repeat('1',64);
 r:=public.newsletter_confirm_batch(repeat('1',64),'test',jsonb_build_object('club_info',repeat('2',64)),'{}');
 assert r->>'status'='expired';
 -- A superseded choice invalidates the whole earlier batch atomically.
 r:=public.newsletter_request_membership_topics('changed-check@example.org','test',repeat('3',64),'{}','choices-v1','BSV-20260925-150005-AA06',array['newsletter','club_info']);
 update public.newsletter_subscriptions set requested_at=now()-interval '10 minutes' where email='changed-check@example.org';
 perform public.newsletter_request_topic('changed-check@example.org','test',repeat('4',64),'{}','choices-v2','batch-check-ip','newsletter');
 r:=public.newsletter_confirm_batch(repeat('3',64),'test',jsonb_build_object('newsletter',repeat('5',64),'club_info',repeat('6',64)),'{}');
 assert r->>'status'='invalid';
 assert not exists(select 1 from public.newsletter_subscriptions where email='changed-check@example.org' and status='confirmed');
 -- The existing single-list links continue to work.
 r:=public.newsletter_confirm(repeat('4',64),'test',repeat('5',64),'{}');
 assert r->>'status'='confirmed';
 assert not has_table_privilege('anon','public.newsletter_confirmation_batches','select');
 assert not has_table_privilege('authenticated','public.newsletter_confirmation_items','select');
 assert not has_function_privilege('anon','public.newsletter_confirm_batch(text,text,jsonb,jsonb)','execute');
end;
$$;

rollback;
