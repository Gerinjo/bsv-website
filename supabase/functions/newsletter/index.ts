import { createClient } from 'npm:@supabase/supabase-js@2.99.3';
import { getEmailRuntimeConfig, sendEmail } from '../_shared/email-service.ts';
import { createNewsletterHandler } from './handler.mjs';
import { NORDSTERN_SEGMENT_ID, CLUB_INFO_SEGMENT_ID } from './workflow.mjs';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(createNewsletterHandler({
  db, serviceKey, config: getEmailRuntimeConfig(), sendEmail,
  contactsApiKey: Deno.env.get('NEWSLETTER_RESEND_CONTACTS_API_KEY'),
  workerSecret: Deno.env.get('NEWSLETTER_WORKER_SECRET') || serviceKey,
  siteUrl: Deno.env.get('NEWSLETTER_SITE_URL') || 'https://bsvnordstern.de',
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || 'https://bsvnordstern.de,https://www.bsvnordstern.de').split(',').map((item) => item.trim()).filter(Boolean),
  segmentId: Deno.env.get('NEWSLETTER_RESEND_SEGMENT_ID') || NORDSTERN_SEGMENT_ID,
  infoSegmentId: Deno.env.get('NEWSLETTER_INFO_SEGMENT_ID') || CLUB_INFO_SEGMENT_ID,
}));
