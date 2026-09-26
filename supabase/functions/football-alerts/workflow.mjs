import { collectRecipientEmails } from '../_shared/membership-routing.mjs';
import { footballAlertEmail } from './emails.mjs';

export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function deliverFootballAlerts({ alerts, recipients, store, send, mode, dryRun = false, pause = async () => {}, deadline = Infinity }) {
  const result = { candidates: alerts.length, sent: 0, skipped: 0, failed: 0, missingRecipients: [], previews: [] };
  const sorted = [...alerts].sort((a, b) => Number(b.kind === 'missing_referee') - Number(a.kind === 'missing_referee') || a.date.localeCompare(b.date));
  let attempts = 0;
  for (const alert of sorted) {
    const row = recipients.find((entry) => entry.schluessel === alert.routingKey && entry.aktiv);
    const addresses = row ? collectRecipientEmails([row]) : [];
    if (!addresses?.length) { result.missingRecipients.push(alert.routingKey); continue; }
    const message = footballAlertEmail(alert, addresses);
    if (dryRun) {
      result.previews.push({ kind: alert.kind, team: alert.team, date: alert.date, kickoff: alert.kickoff,
        match: alert.matchLabel, pitch: alert.pitch, training: alert.trainingTime, booking: alert.bookingTime,
        recipientCount: addresses.length, subject: message.subject });
      continue;
    }
    if (attempts >= 40 || Date.now() >= deadline) { result.skipped++; continue; }
    let delivery;
    try { delivery = await store.claim(alert, await sha256(alert.identity), mode, message); }
    catch { result.failed++; continue; }
    if (!delivery) { result.skipped++; continue; }
    attempts++;
    await pause();
    try {
      const response = await send(delivery.message, { idempotencyKey: `football-alert/${mode}/${delivery.id}`, timeoutMs: 15_000 });
      await store.sent(delivery, response.id);
      result.sent++;
    } catch {
      // No provider error bodies or recipient addresses in logs.
      await store.failed(delivery).catch(() => {});
      result.failed++;
    }
  }
  result.missingRecipients = [...new Set(result.missingRecipients)];
  return result;
}
