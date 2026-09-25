export const NORDSTERN_SEGMENT_ID = '76a53fca-4c76-40a7-8c56-404806f88364';
export const CLUB_INFO_SEGMENT_ID = '13c075cd-265a-42d5-a220-4ea98307d83f';

// Resend is only touched by confirmed LIVE jobs. Test contacts never enter a segment.
export async function syncNewsletterContact({ kind, email, apiKey, segmentId, fetcher = fetch }) {
  const path = `/contacts/${encodeURIComponent(email)}`;
  const call = async (method, resource, body, allowMissing = false) => {
    const response = await fetcher(`https://api.resend.com${resource}`, {
      method, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
    });
    // Resend's shared request limit also includes the email sent next.
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (allowMissing && response.status === 404) return null;
    // Do not include provider bodies: they can contain email addresses or secrets.
    if (!response.ok) throw new Error(`resend_contact_${response.status}`);
    return response.json();
  };
  if (kind === 'unsubscribe') {
    await call('DELETE', `${path}/segments/${segmentId}`, undefined, true);
    return;
  }
  const contact = await call('GET', path, undefined, true);
  if (!contact) {
    await call('POST', '/contacts', { email, unsubscribed: false, segments: [{ id: segmentId }] });
    return;
  } else if (contact.unsubscribed) {
    // A global opt-out must not silently re-enable other mailing lists.
    // Resend's own preference center/support must resolve this case.
    throw new Error('resend_global_opt_out');
  }
  await call('POST', `${path}/segments/${segmentId}`);
}

const checked = async (query) => {
  const result = await query;
  if (result.error) throw new Error('newsletter_database');
  return result.data;
};

export async function processNewsletterJob({ db, config, sendEmail, fetcher = fetch, segmentId = NORDSTERN_SEGMENT_ID, infoSegmentId = CLUB_INFO_SEGMENT_ID, contactsApiKey = config.resendApiKey, jobId = null }) {
  const jobs = await checked(db.rpc('newsletter_claim_job', { p_mode: config.mode, p_job_id: jobId }));
  const job = jobs?.[0];
  if (!job) return false;
  const save = (values) => checked(db.from('newsletter_jobs').update(values).eq('id', job.id).eq('lease_id', job.lease_id));
  try {
    const sub = await checked(db.from('newsletter_subscriptions').select('*').eq('id', job.subscription_id).single());
    const items = job.confirmation_batch_id
      ? await checked(db.from('newsletter_confirmation_items').select('token_hash, subscription:newsletter_subscriptions(*)').eq('batch_id', job.confirmation_batch_id))
      : [{ subscription: sub }];
    const subscriptions = items.map((item) => item.subscription);
    if (!subscriptions.length || subscriptions.some((item) => !item || item.email !== sub.email || item.mail_mode !== config.mode || !['newsletter', 'club_info'].includes(item.topic ?? 'newsletter'))) throw new Error('invalid_job_message');
    if (sub.mail_mode !== config.mode) throw new Error('mail_mode_changed');
    if (Date.now() - Date.parse(job.first_attempt_at) >= 23 * 60 * 60 * 1000) {
      await save({ status: 'failed', message: null, last_error: 'retry_window_expired', locked_until: null });
      return true;
    }
    const currentItems = items.filter((item) => (!item.token_hash || item.token_hash === item.subscription.confirmation_token_hash)
      && (job.kind === 'confirmation' ? !item.subscription.token_consumed : item.subscription.status === 'confirmed'));
    if ((job.kind === 'confirmation' && currentItems.length !== items.length) || (job.kind === 'welcome' && !currentItems.length)) {
      await save({ status: 'cancelled', message: null, locked_until: null });
      return true;
    }
    if (job.kind !== 'confirmation' && !job.provider_synced) {
      if (!config.testMode) {
        const targets = job.kind === 'unsubscribe' ? subscriptions : currentItems.map((item) => item.subscription);
        for (const item of targets) await syncNewsletterContact({ kind: job.kind, email: item.email, apiKey: contactsApiKey,
          segmentId: item.topic === 'club_info' ? infoSegmentId : segmentId, fetcher });
      }
      await save({ provider_synced: true });
    }
    // A later opt-out still allows the other list to sync, without sending a
    // stale welcome message that claims both subscriptions are active.
    if (job.kind === 'welcome' && currentItems.length !== items.length) {
      await save({ status: 'cancelled', message: null, locked_until: null });
      return true;
    }
    let providerId = null;
    if (job.kind !== 'unsubscribe') {
      if (!job.message || job.message.to !== sub.email) throw new Error('invalid_job_message');
      const result = await sendEmail(job.message, { idempotencyKey: `newsletter/${config.mode}/${job.id}`, timeoutMs: 15000 });
      if (result.mode !== config.mode) throw new Error('mail_mode_changed');
      providerId = result.id;
    }
    await save({ status: 'sent', completed_at: new Date().toISOString(), provider_id: providerId, message: null, locked_until: null, last_error: null });
  } catch (error) {
    const code = typeof error?.message === 'string' && /^(resend_contact_\d+|resend_global_opt_out|newsletter_database|mail_mode_changed|invalid_job_message)$/.test(error.message) ? error.message : 'delivery_failed';
    const terminal = job.attempts >= 10 || ['resend_global_opt_out', 'invalid_job_message', 'mail_mode_changed'].includes(code);
    await save({ status: terminal ? 'failed' : 'pending', last_error: code, locked_until: null,
      available_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** (job.attempts - 1)) * 1000).toISOString(),
      ...(terminal ? { message: null } : {}),
    });
    console.error('Newsletter-Workflow:', job.id, code);
  }
  return true;
}
