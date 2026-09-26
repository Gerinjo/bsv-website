import { createClient } from 'npm:@supabase/supabase-js@2.99.3';
import { getEmailRuntimeConfig, sendEmail } from '../_shared/email-service.ts';
import { berlinNow } from '../_shared/football-matches.ts';
import { collectFootballAlerts } from './rules.ts';
import { loadFootballAlertSources } from './sources.ts';
import { deliverFootballAlerts, sha256 } from './workflow.mjs';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return json({ error: 'unauthorized' }, 401);
  const { data: settings, error } = await db.from('football_alert_settings').select('enabled,worker_secret_sha256').eq('id', true).single();
  if (error || !settings) return json({ error: 'not_configured' }, 503);
  if (await sha256(token) !== settings.worker_secret_sha256) return json({ error: 'unauthorized' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  if (!body || !['dry-run', 'run'].includes(body.action)) return json({ error: 'invalid_action' }, 400);
  const dryRun = body.action === 'dry-run';
  if (!dryRun && !settings.enabled) return json({ skipped: 'disabled' });
  const now = new Date();
  const hour = Number(berlinNow(now).slice(11, 13));
  if (!dryRun && (hour < 8 || hour > 20)) return json({ skipped: 'outside_sending_hours' });
  const mode = getEmailRuntimeConfig().mode;
  const { data: run, error: runError } = await db.from('football_alert_runs').insert({ dry_run: dryRun, mail_mode: mode }).select('id').single();
  if (runError || !run) return json({ error: 'run_log_unavailable' }, 503);
  try {
    const sources = await loadFootballAlertSources(now);
    const alerts = collectFootballAlerts({ ...sources, now });
    const keys = [...new Set(alerts.map((alert) => alert.routingKey))];
    const { data: recipients, error: recipientError } = keys.length
      ? await db.from('contact_empfaenger').select('schluessel,email,weitere_emails,aktiv').in('schluessel', keys)
      : { data: [], error: null };
    if (recipientError) throw new Error('recipient_lookup_failed');
    const check = (result: { error: unknown }) => { if (result.error) throw new Error('delivery_log_failed'); };
    const result = await deliverFootballAlerts({ alerts, recipients: recipients ?? [], mode, dryRun, send: sendEmail, deadline: now.getTime() + 105_000,
      pause: () => new Promise((resolve) => setTimeout(resolve, 600)),
      store: {
        async claim(alert: { kind: string; matchId: string; routingKey: string; date: string }, eventKey: string, mailMode: string, message: unknown) {
          const response = await db.rpc('claim_football_alert', { p_event_key: eventKey, p_mail_mode: mailMode, p_kind: alert.kind,
            p_match_id: alert.matchId, p_team_key: alert.routingKey, p_match_date: alert.date, p_message: message });
          check(response); return response.data?.[0];
        },
        async sent(delivery: { id: string; lease_id: string }, providerId: string | null) {
          check(await db.from('football_alert_deliveries').update({ status: 'sent', provider_id: providerId, completed_at: new Date().toISOString() })
            .eq('id', delivery.id).eq('lease_id', delivery.lease_id).eq('status', 'sending'));
        },
        async failed(delivery: { id: string; lease_id: string }) {
          check(await db.from('football_alert_deliveries').update({ status: 'failed', last_error: 'delivery_failed', locked_until: new Date(Date.now() + 30 * 60_000).toISOString() })
            .eq('id', delivery.id).eq('lease_id', delivery.lease_id).eq('status', 'sending'));
        },
      },
    });
    const summary = { ...result, issues: sources.issues, mode, checkedAt: now.toISOString() };
    const partial = sources.issues.length > 0 || result.failed > 0 || result.missingRecipients.length > 0;
    check(await db.from('football_alert_runs').update({ status: partial ? 'partial' : 'ok', completed_at: new Date().toISOString(), summary }).eq('id', run.id));
    return json(summary, partial ? 207 : 200);
  } catch {
    await db.from('football_alert_runs').update({ status: 'failed', completed_at: new Date().toISOString(), summary: { error: 'run_failed' } }).eq('id', run.id);
    return json({ error: 'run_failed', runId: run.id }, 503);
  }
});
