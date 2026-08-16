import { resolveEmailMode } from './email-mode.mjs';

export type EmailMode = 'test' | 'live';

export type EmailAttachment = {
  filename: string;
  content: string;
  content_type?: string;
};

export type EmailMessage = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

export type EmailRuntimeConfig = {
  mode: EmailMode;
  testMode: boolean;
  testRecipient: string;
  mailFrom: string;
  resendApiKey: string;
};

const DEFAULT_TEST_RECIPIENT = 'jerome.ernsberger@gmail.com';
const list = (value?: string | string[]) => {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean);
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const getEmailRuntimeConfig = (): EmailRuntimeConfig => {
  const resolvedMode = resolveEmailMode((name: string) => Deno.env.get(name));
  if (resolvedMode.liveBlocked) {
    console.error('Live-E-Mail wurde angefordert, aber EMAIL_LIVE_CONFIRMATION fehlt oder ist ungültig. Testmodus bleibt aktiv.');
  }

  return {
    mode: resolvedMode.mode as EmailMode,
    testMode: resolvedMode.testMode,
    testRecipient: Deno.env.get('EMAIL_TEST_RECIPIENT')?.trim() || DEFAULT_TEST_RECIPIENT,
    mailFrom: Deno.env.get('MAIL_FROM')?.trim() ?? '',
    resendApiKey: Deno.env.get('RESEND_API_KEY')?.trim() ?? '',
  };
};

export const sendEmail = async (message: EmailMessage) => {
  const config = getEmailRuntimeConfig();
  if (!config.resendApiKey) throw new Error('RESEND_API_KEY fehlt.');
  if (!config.mailFrom) throw new Error('MAIL_FROM fehlt.');
  if (config.testMode && !config.testRecipient) throw new Error('EMAIL_TEST_RECIPIENT fehlt.');

  const intendedRecipients = [
    ...list(message.to).map((address) => `To: ${address}`),
    ...list(message.cc).map((address) => `Cc: ${address}`),
    ...list(message.bcc).map((address) => `Bcc: ${address}`),
    ...(message.reply_to ? [`Reply-To: ${message.reply_to}`] : []),
  ];

  const payload: Record<string, unknown> = {
    from: config.mailFrom,
    to: config.testMode ? [config.testRecipient] : list(message.to),
    subject: config.testMode ? `[TEST] ${message.subject}` : message.subject,
    html: config.testMode
      ? `<div style="margin:0 0 20px;padding:14px 16px;border:2px solid #b5000d;background:#fff2f3;font-family:Arial,sans-serif;font-size:13px;line-height:1.5">
          <strong>TESTMODUS – diese E-Mail ging ausschließlich an ${escapeHtml(config.testRecipient)}.</strong><br>
          Vorgesehene Live-Zustellung: ${escapeHtml(intendedRecipients.join(' · ') || 'noch nicht konfiguriert')}
        </div>${message.html}`
      : message.html,
  };

  if (message.text) {
    payload.text = config.testMode
      ? `TESTMODUS – Zustellung ausschließlich an ${config.testRecipient}.\nVorgesehene Live-Zustellung: ${intendedRecipients.join(' · ') || 'noch nicht konfiguriert'}\n\n${message.text}`
      : message.text;
  }
  if (message.attachments?.length) payload.attachments = message.attachments;

  if (config.testMode) {
    payload.reply_to = config.testRecipient;
  } else {
    const cc = list(message.cc);
    const bcc = list(message.bcc);
    if (cc.length) payload.cc = cc;
    if (bcc.length) payload.bcc = bcc;
    if (message.reply_to) payload.reply_to = message.reply_to;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`E-Mail-Versand fehlgeschlagen (${response.status}): ${detail}`);
  }

  const result = await response.json().catch(() => ({})) as { id?: unknown };
  return {
    mode: config.mode,
    id: typeof result.id === 'string' ? result.id : null,
  };
};
