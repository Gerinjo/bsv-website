import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEmailRuntimeConfig, sendEmail, type EmailAttachment } from '../_shared/email-service.ts';
import { collectRecipientEmails, getMembershipRoutingKeys } from '../_shared/membership-routing.mjs';

const MAX_REQUEST_BYTES = 18 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const allowedMimeTypes = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
]);

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status });
const text = (value: unknown, maximum: number) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function secretsMatch(candidate: string, expected: string): boolean {
  if (!candidate || !expected || candidate.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    difference |= candidate.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

function attachmentBytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor(base64.length * 3 / 4) - padding;
}

const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const expectedSecret = Deno.env.get('MEMBERSHIP_EMAIL_SECRET')?.trim() ?? '';
  const suppliedSecret = request.headers.get('x-bsv-membership-secret') ?? '';
  if (!expectedSecret) return json({ error: 'mail_bridge_not_configured' }, 503);
  if (!secretsMatch(suppliedSecret, expectedSecret)) return json({ error: 'unauthorized' }, 401);

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ error: 'request_too_large' }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const messageType = text(body.messageType, 20);
  const subject = text(body.subject, 200);
  const plainText = text(body.text, 100_000);
  const html = text(body.html, 300_000);
  const replyTo = text(body.replyTo, 200).toLowerCase();
  const applicantAddress = text(body.to, 200).toLowerCase();
  const routingKey = text(body.routingKey, 200).toLowerCase();
  let recipient: string | string[] = '';

  if (messageType === 'applicant') {
    recipient = applicantAddress;
  } else {
    const routingKeys = getMembershipRoutingKeys(messageType, routingKey);
    if (!routingKeys) return json({ error: 'invalid_routing' }, 422);

    const supabase = getSupabase();
    if (!supabase) return json({ error: 'recipient_lookup_not_configured' }, 503);

    const { data: recipientRows, error: recipientError } = await supabase
      .from('contact_empfaenger')
      .select('schluessel, email, weitere_emails')
      .in('schluessel', routingKeys)
      .eq('aktiv', true);

    if (recipientError) {
      console.error('Mitgliedsantrags-Empfaenger konnten nicht geladen werden:', recipientError);
      return json({ error: 'recipient_lookup_failed' }, 500);
    }

    const foundKeys = new Set((recipientRows ?? []).map((row) => row.schluessel));
    if (routingKeys.some((key) => !foundKeys.has(key))) {
      console.error('Mitgliedsantrags-Routing ist unvollstaendig:', routingKeys, [...foundKeys]);
      return json({ error: 'recipient_not_configured' }, 503);
    }

    const recipients = collectRecipientEmails(recipientRows ?? []);
    if (!recipients?.length) return json({ error: 'invalid_recipient_configuration' }, 503);
    recipient = recipients;
  }

  if (
    (!Array.isArray(recipient) && (!recipient || !validEmail(recipient))) ||
    (Array.isArray(recipient) && recipient.some((address) => !validEmail(address))) ||
    !subject || !plainText || !html
  ) {
    return json({ error: 'invalid_message' }, 422);
  }
  if (replyTo && !validEmail(replyTo)) return json({ error: 'invalid_reply_to' }, 422);

  const sourceAttachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 12) : [];
  const attachments: EmailAttachment[] = [];
  let totalBytes = 0;
  for (const item of sourceAttachments) {
    if (!item || typeof item !== 'object') return json({ error: 'invalid_attachment' }, 422);
    const record = item as Record<string, unknown>;
    const filename = text(record.filename, 160).replaceAll(/[\\/\r\n]/g, '-');
    const contentType = text(record.contentType, 100).toLowerCase();
    const content = typeof record.content === 'string' ? record.content : '';
    if (!filename || !allowedMimeTypes.has(contentType) || !/^[A-Za-z0-9+/]*={0,2}$/.test(content)) {
      return json({ error: 'invalid_attachment' }, 422);
    }
    totalBytes += attachmentBytes(content);
    if (totalBytes > MAX_ATTACHMENT_BYTES) return json({ error: 'attachments_too_large' }, 413);
    attachments.push({ filename, content, content_type: contentType });
  }

  try {
    const result = await sendEmail({
      to: recipient,
      reply_to: replyTo || undefined,
      subject,
      html,
      text: plainText,
      attachments,
    });
    return json({ ok: true, mailMode: result.mode, resendId: result.id }, 201);
  } catch (error) {
    console.error('Mitgliedsantrags-Mail konnte nicht versendet werden:', error);
    return json({ error: 'email_failed', mailMode: getEmailRuntimeConfig().mode }, 502);
  }
});
