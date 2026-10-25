const SITE = 'https://bsvnordstern.de';
const FEED = `${SITE}/mitgliedschaft-sponsoren.json`;
const HOUR = 60 * 60 * 1000;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
const safeUrl = value => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
};

function eligibleSponsors(records) {
  const unique = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || record.youth !== true || typeof record.id !== 'string' || !record.id.trim()
      || typeof record.name !== 'string' || !record.name.trim()) continue;
    const website = safeUrl(record.website), logo = safeUrl(record.logo);
    if (!website || !logo || logo.origin !== SITE || !logo.pathname.startsWith('/images/sponsors/')) continue;
    if (!Number.isInteger(record.width) || record.width < 1 || record.width > 112
      || !Number.isInteger(record.height) || record.height < 1 || record.height > 64) continue;
    unique.set(record.id, { ...record, website: website.href, logo: logo.href });
  }
  return [...unique.values()];
}

export function selectYouthSponsors(records, random = Math.random) {
  const pool = eligibleSponsors(records);
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, 4);
}

// Cache the approved pool, never the selection: each email gets a fresh draw.
// Match the membership email's one-hour cache and one-day outage fallback.
export function createYouthSponsorLoader({ fetcher = fetch, clock = Date.now, random = Math.random } = {}) {
  let cached = null, cachedAt = 0;
  return async () => {
    if (cached !== null && clock() - cachedAt < HOUR) return selectYouthSponsors(cached, random);
    try {
      const response = await fetcher(FEED, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error(`Sponsor feed: HTTP ${response.status}`);
      const data = await response.json();
      if (data?.version !== 1 || !Array.isArray(data.sponsors)) throw new Error('Invalid sponsor feed');
      cached = eligibleSponsors(data.sponsors);
      cachedAt = clock();
      return selectYouthSponsors(cached, random);
    } catch (error) {
      console.error('Jugendsponsoren konnten nicht aktualisiert werden:', String(error));
      return cached !== null && clock() - cachedAt < 24 * HOUR ? selectYouthSponsors(cached, random) : [];
    }
  };
}

export const loadYouthSponsors = createYouthSponsorLoader();

export function buildYouthSponsorFooter(sponsors = []) {
  const selected = eligibleSponsors(sponsors).slice(0, 4);
  const thanks = 'Danke an unsere Jugendsponsoren! Sie unterstützen Training, Teamgeist und die Entwicklung unserer jungen Spielerinnen und Spieler.';
  const pairs = [];
  for (let index = 0; index < selected.length; index += 2) pairs.push(selected.slice(index, index + 2));
  const logos = pairs.map(pair => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="display:inline-table;width:100%;max-width:280px;vertical-align:middle;table-layout:fixed;"><tr>${pair.map(sponsor => `<td width="50%" height="84" align="center" valign="middle" style="padding:8px;background:#ffffff;"><a href="${escapeHtml(sponsor.website)}" style="display:block;text-decoration:none;color:#164f32;"><img src="${escapeHtml(sponsor.logo)}" alt="${escapeHtml(sponsor.name)}" width="${sponsor.width}" height="${sponsor.height}" style="display:block;width:100%;max-width:${sponsor.width}px;height:auto;border:0;margin:0 auto;"></a></td>`).join('')}${pair.length === 1 ? '<td width="50%"></td>' : ''}</tr></table>`).join('');
  return {
    html: `<tr><td style="padding:24px;background:#f8faf8;border-top:3px solid #f4d638;text-align:center;"><h2 style="margin:0 0 10px;color:#164f32;font-size:20px;">Unsere Jugendsponsoren</h2><p style="margin:0 0 16px;color:#3f5146;font-size:13px;line-height:1.6;">${thanks}</p><div style="font-size:0;text-align:center;">${logos}</div><p style="margin:16px 0 0;font-size:13px;line-height:1.5;"><a href="${SITE}/werbepartner" style="color:#164f32;font-weight:700;text-decoration:underline;">Alle Sponsoren auf unserer Website ansehen →</a></p></td></tr>`,
    text: `\n\nUNSERE JUGENDSPONSOREN\n${thanks}\n${selected.map(sponsor => `${sponsor.name}: ${sponsor.website}`).join('\n')}\nAlle Sponsoren auf unserer Website: ${SITE}/werbepartner`,
  };
}
