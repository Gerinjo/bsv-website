const SITE = 'https://bsvnordstern.de';
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (value) => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
};

export function selectSponsors(items, random = Math.random) {
  const unique = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    const website = safeUrl(item.website);
    const logo = safeUrl(item.logo);
    if (!website || !logo || new URL(logo).hostname !== 'bsvnordstern.de') continue;
    unique.set(item.id, { ...item, website, logo, width: Math.max(1, Math.min(112, Number(item.width) || 112)), height: Math.max(1, Math.min(64, Number(item.height) || 64)) });
  }
  const pool = [...unique.values()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export async function loadSponsors(fetcher = fetch) {
  try {
    const response = await fetcher(`${SITE}/mitgliedschaft-sponsoren.json`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];
    return selectSponsors((await response.json()).sponsors);
  } catch { return []; }
}

export function renderNewsletterEmail({ kind, email, actionUrl, sponsors = [], topic = 'newsletter', unsubscribeUrls = {} }) {
  if (!['newsletter', 'club_info', 'both'].includes(topic)) throw new Error('invalid_subscription_topic');
  const both = topic === 'both';
  const infoOnly = topic === 'club_info';
  const confirmation = kind === 'confirmation';
  const subscriptionLabel = both ? 'Newsletter und Informations-E-Mails' : infoOnly ? 'Informations-E-Mails' : 'Newsletter';
  const subject = both
    ? (confirmation ? 'BSV Nordstern Radolfzell: Bitte bestätige deine E-Mail-Auswahl ✦' : 'Deine Anmeldung für Newsletter und Informations-E-Mails ist bestätigt ✦')
    : infoOnly
    ? (confirmation ? 'BSV Nordstern Radolfzell: Informations-E-Mails bestätigen ✦' : 'Deine Anmeldung für BSV-Informations-E-Mails ist bestätigt ✦')
    : (confirmation ? 'BSV Nordstern Radolfzell: Bitte bestätige deine Newsletter-Anmeldung ✦' : 'Willkommen beim Newsletter des BSV Nordstern Radolfzell! ✦');
  const headline = confirmation ? 'Ein Klick.<br>Ganz nah am BSV.' : 'Du bist dabei.<br>Auf geht’s grün!';
  const intro = both
    ? (confirmation
      ? 'Schön, dass du mit dem BSV in Verbindung bleiben möchtest! Du hast unseren Newsletter und allgemeine Vereinsinformationen per E-Mail ausgewählt. Mit einem Klick bestätigst du deine E-Mail-Adresse für beide Angebote. Bereits bestätigte Abonnements bleiben bestehen.'
      : 'Deine E-Mail-Adresse ist bestätigt. Du bist für unseren Newsletter und allgemeine Vereinsinformationen angemeldet. Du erhältst Vereinsgeschichten, Neuigkeiten sowie Einladungen zur Jugendvollversammlung oder Mitgliederversammlung und wichtige organisatorische Mitteilungen.')
    : infoOnly
    ? (confirmation
      ? 'Du möchtest allgemeine Vereinsinformationen per E-Mail erhalten: Einladungen zur Jugendvollversammlung oder Mitgliederversammlung und wichtige organisatorische Mitteilungen. Bestätige bitte deine E-Mail-Adresse. Diese Anmeldung umfasst keinen Newsletter.'
      : 'Deine E-Mail-Adresse ist bestätigt. Du erhältst künftig allgemeine Vereinsinformationen: Einladungen zur Jugendvollversammlung oder Mitgliederversammlung und wichtige organisatorische Mitteilungen. Für den Newsletter wirst du durch diese Anmeldung nicht angemeldet.')
    : confirmation
    ? 'Schön, dass du unseren Newsletter abonnieren möchtest! Bestätige bitte noch deine E-Mail-Adresse – erst dann nehmen wir dich in unseren Newsletter auf.'
    : 'Deine E-Mail-Adresse ist bestätigt. Du bist für unseren Newsletter angemeldet. Freu dich auf Geschichten aus unserem Verein, Neuigkeiten von den Jungen Sternen und Einladungen zu unseren Veranstaltungen.';
  const buttonLabel = confirmation ? 'Anmeldung bestätigen' : 'Den BSV entdecken';
  const buttonUrl = confirmation ? actionUrl : SITE;
  const note = confirmation
    ? 'Der Bestätigungslink ist 48 Stunden gültig. Du hast dich nicht angemeldet? Dann ignoriere diese Nachricht. Ohne deine Bestätigung erhältst du keine E-Mails aus diesem Verteiler.'
    : 'Wir freuen uns, dass du Teil unserer grün-weißen Gemeinschaft bist. Ob am Spielfeldrand, in der Halle oder mittendrin im Vereinsleben: Schön, dass du dabei bist!';
  const partnersHtml = sponsors.map((partner) => `<td class="partner" align="center" valign="middle" style="padding:14px 8px;background:#fff;"><a href="${escapeHtml(partner.website)}" style="color:#164f32;font-size:12px;text-decoration:none;"><img src="${escapeHtml(partner.logo)}" alt="${escapeHtml(partner.name)}" width="${partner.width}" height="${partner.height}" style="display:block;border:0;margin:0 auto 10px;max-width:112px;"><span>${escapeHtml(partner.name)}</span></a></td>`).join('');
  const unsubscribeLinks = both
    ? [['Newsletter', unsubscribeUrls.newsletter], ['Informations-E-Mails', unsubscribeUrls.club_info]]
    : [[subscriptionLabel, actionUrl]];
  if (!confirmation && unsubscribeLinks.some(([, url]) => !safeUrl(url))) throw new Error('invalid_unsubscribe_url');
  const unsubscribeHtml = confirmation ? '' : `<br>Du kannst jedes Angebot unabhängig abbestellen:<br>${unsubscribeLinks.map(([label, url]) => `<a href="${escapeHtml(url)}" style="color:#f4d638;">${label} abmelden</a>`).join(' · ')}`;
  const unsubscribeText = confirmation ? '' : `\n${unsubscribeLinks.map(([label, url]) => `${label} abmelden: ${url}`).join('\n')}\nDie Abmeldung gilt nur für das jeweilige Angebot.`;
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title><style>body{margin:0}table{border-collapse:collapse}a{overflow-wrap:anywhere}@media(max-width:600px){.section{padding:26px 22px!important}.headline{font-size:34px!important}.partner{display:block!important;width:auto!important}}</style></head>
<body style="margin:0;background:#edf0e9;color:#193c2c;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${confirmation ? 'Nur noch deine E-Mail-Adresse bestätigen – dann bist du dabei.' : 'Deine Anmeldung ist bestätigt. Freu dich auf Post aus deinem Verein.'}</div>
<table role="presentation" width="100%" style="background:#edf0e9;"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="720"><tr><td><![endif]-->
<table role="presentation" width="100%" style="max-width:720px;background:white;border:4px solid #17613a;">
<tr><td class="section" style="padding:32px 40px;background:#092f20;border-top:6px solid #f4d638;">
<table role="presentation" width="100%"><tr><td><p style="margin:0;color:#f4d638;font-size:13px;letter-spacing:2px;font-weight:bold;">${both ? 'DEINE E-MAIL-AUSWAHL' : infoOnly ? 'INFORMATIONEN AUS DEM VEREIN' : 'UNSER NEWSLETTER'}</p><p style="color:#d7e5dc;font-size:13px;">BSV Nordstern Radolfzell · Seit 1956</p></td><td width="76"><a href="${SITE}/"><img src="${SITE}/images/verein/wappen/bsv-nordstern.png" width="76" height="72" alt="BSV Nordstern" style="display:block;border:0;"></a></td></tr></table>
<h1 class="headline" style="margin:28px 0 8px;color:white;font-size:44px;line-height:1.05;letter-spacing:-1px;">${headline}</h1></td></tr>
<tr><td class="section" style="padding:36px 40px;font-size:16px;line-height:1.7;">
<p style="margin-top:0;">Hallo, liebe Nordstern-Freundin, lieber Nordstern-Freund!</p><p>${intro}</p>
<table role="presentation"><tr><td style="background:#f4d638;border-radius:4px;"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:15px 24px;color:#092f20;font-weight:bold;text-decoration:none;">${buttonLabel} →</a></td></tr></table>
${confirmation ? `<p style="font-size:12px;line-height:1.6;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br><a href="${escapeHtml(actionUrl)}" style="color:#164f32;word-break:break-all;">${escapeHtml(actionUrl)}</a></p>` : ''}
${!infoOnly ? '<p style="padding:16px;background:#f4f1e8;"><strong>Unser Newsletter entsteht gerade.</strong><br>Wir arbeiten aktuell am Konzept. Die ersten Sendungen folgen in absehbarer Zeit. Mit deiner bestätigten Anmeldung bist du zum Start dabei.</p>' : ''}<p>${note}</p><p style="margin-bottom:0;">Grün-weiße Grüße<br><strong>Dein BSV Nordstern Radolfzell</strong><br><span style="color:#164f32;">#aufgehtsgrün</span></p></td></tr>
<tr><td class="section" style="padding:28px 40px;background:#f4f1e8;"><h2 style="margin:0 0 12px;font-size:20px;">Gemeinsam mehr möglich machen.</h2><p style="font-size:14px;line-height:1.6;">Danke an unsere Partner, die Sport und Gemeinschaft beim BSV unterstützen.</p>${sponsors.length ? `<table role="presentation" width="100%"><tr>${partnersHtml}</tr></table>` : ''}<p style="font-size:13px;"><a href="${SITE}/werbepartner" style="color:#164f32;">Alle BSV-Partner entdecken →</a></p></td></tr>
<tr><td class="section" style="padding:28px 40px;background:#092f20;color:white;font-size:13px;line-height:1.8;"><strong>BSV Nordstern e.V. Radolfzell</strong><br>Schlesierstraße 43 · 78315 Radolfzell<br><a href="mailto:info@bsvnordstern.de" style="color:white;">info@bsvnordstern.de</a><p><a href="${SITE}/impressum" style="color:#d7e5dc;">Impressum</a> · <a href="${SITE}/datenschutz#newsletter" style="color:#d7e5dc;">Datenschutz</a></p><p style="color:#d7e5dc;font-size:12px;">Diese Nachricht gehört zu deiner Anmeldung (${subscriptionLabel}) für ${escapeHtml(email)}.${unsubscribeHtml}</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
  const text = `${subject}\n\nHallo, liebe Nordstern-Freundin, lieber Nordstern-Freund!\n\n${intro}\n\n${!infoOnly ? 'Unser Newsletter entsteht gerade: Wir arbeiten aktuell am Konzept. Die ersten Sendungen folgen in absehbarer Zeit. Mit deiner bestätigten Anmeldung bist du zum Start dabei.\n\n' : ''}${buttonLabel}: ${buttonUrl}\n\n${note}\n\nGrün-weiße Grüße\nDein BSV Nordstern Radolfzell\n#aufgehtsgrün\n\nDanke an unsere Partner, die Sport und Gemeinschaft beim BSV unterstützen.\n${sponsors.map((partner) => `${partner.name}: ${partner.website}`).join('\n')}\nAlle BSV-Partner: ${SITE}/werbepartner\n\nBSV Nordstern e.V. Radolfzell\nSchlesierstraße 43 · 78315 Radolfzell\ninfo@bsvnordstern.de\nImpressum: ${SITE}/impressum\nDatenschutz: ${SITE}/datenschutz#newsletter\n\nDiese Nachricht gehört zu deiner Anmeldung (${subscriptionLabel}) für ${email}.${unsubscribeText}\n`;
  return { to: email, subject, html, text };
}
