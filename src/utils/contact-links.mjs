import { load } from 'cheerio';
import { emailTopics } from '../data/contactPeople.server.mjs';

const contactIcon = (kind) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${kind === 'phone' ? '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>' : '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>'}</svg>`;

export function contactHref(href, pathname = '/', base = '/') {
  let email;
  try { email = decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim().toLowerCase(); }
  catch { email = ''; }
  let topic = emailTopics.get(email);
  if (email === 'stefan.gastaudo@bsvnordstern.de' && pathname.includes('/jugend/torwarttraining')) topic = 'goalkeeping';
  if (email === 'verwaltung@bsvnordstern.de' && pathname.includes('/abteilungen/gymnastik')) topic = 'gymnastics';
  if (email === 'info@bsvnordstern.de' && pathname.includes('/verein/kuendigung')) topic = 'membership';
  const prefix = `/${base.replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
  return `${prefix}/kontakt${topic ? `?thema=${encodeURIComponent(topic)}` : ''}`;
}

// Runs while Astro renders: form links work in the initial HTML, also without JavaScript.
export function routeContactLinks(html, pathname, base) {
  const $ = load(html);
  $('head').append('<meta name="format-detection" content="telephone=no,email=no">');
  $('a[href]').each((_, element) => {
    const link = $(element);
    const href = link.attr('href')?.trim() ?? '';
    if (/^mailto:/i.test(href)) {
      link.attr('href', contactHref(href, pathname, base));
      link.attr('data-contact-form', '');
      link.removeAttr('target');
    }
    const phone = /^tel:/i.test(href);
    const formIcon = link.closest('.contact-icons, .coach-contacts').length && /\/kontakt(?:\?|$)/.test(link.attr('href') ?? '');
    if (phone || formIcon) {
      const originalLabel = link.attr('aria-label') || link.attr('title') || '';
      const phoneLabel = link.text().replace(/\+?\d[\d\s()/.-]{5,}\d/g, '').replace(/[↗☎:]/g, '').trim();
      const label = phone
        ? (originalLabel && !/\d/.test(originalLabel) ? originalLabel : phoneLabel ? `${phoneLabel} – telefonisch Kontakt aufnehmen` : 'Telefonisch Kontakt aufnehmen')
        : (originalLabel ? `${originalLabel.replace(/E-Mail an /, 'Nachricht an ')} – über das Kontaktformular` : 'Nachricht über das Kontaktformular schreiben');
      link.addClass(`contact-direct contact-action is-${phone ? 'phone' : 'email'}`)
        .attr('aria-label', label).attr('title', label).html(contactIcon(phone ? 'phone' : 'email'));
    }
  });
  // Shared portrait treatment also covers the imported board/committee cards.
  $('.coach-portrait, .department-portrait, .referee-portrait, .referee-page .portrait, .quality-page .portrait').attr('data-profile-portrait', '');
  $('img.uk-border-circle7').attr('data-profile-portrait', '');
  $('[data-profile-portrait] img[src*="/transparent/"]').attr('data-profile-cutout', '');
  return $.html();
}
