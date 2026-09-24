import { loadSponsors, renderNewsletterEmail } from '../newsletter/emails.mjs';
import { token, hash } from './newsletter-tokens.mjs';

// Checkbox wording: Ich möchte den Newsletter und die Vereinszeitschrift digital per E-Mail erhalten.
export const MEMBERSHIP_NEWSLETTER_CONSENT_VERSION = 'mitgliedsantrag-newsletter-2026-09-24';

// Called only by the authenticated membership mail bridge, after PHP accepted
// the complete application. General club information is a separate choice.
export async function queueMembershipNewsletter({ db, body, mode, siteUrl = 'https://bsvnordstern.de', fetcher = fetch }) {
  if (body.messageType !== 'applicant' || body.emailNewsletterAccepted !== true) return 'not_requested';
  const email = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
  if (!db || !['test', 'live'].includes(mode) || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
      || typeof body.applicationNumber !== 'string' || !/^BSV-\d{8}-\d{6}-[A-F0-9]{4}$/.test(body.applicationNumber)) {
    throw new Error('invalid_membership_newsletter_request');
  }
  const confirmationToken = token();
  const message = renderNewsletterEmail({
    kind: 'confirmation', email,
    actionUrl: `${siteUrl.replace(/\/$/, '')}/newsletter/bestaetigen#token=${confirmationToken}`,
    sponsors: await loadSponsors(fetcher),
  });
  const { data, error } = await db.rpc('newsletter_request_membership', {
    p_email: email, p_mode: mode, p_token_hash: await hash(confirmationToken), p_message: message,
    p_consent_version: MEMBERSHIP_NEWSLETTER_CONSENT_VERSION, p_application_number: body.applicationNumber,
  });
  if (error || !['queued', 'pending', 'already_confirmed', 'already_requested'].includes(data?.status)) {
    throw new Error('membership_newsletter_queue_failed');
  }
  // The existing scheduled worker delivers the durable job, including retries.
  return data.status;
}
