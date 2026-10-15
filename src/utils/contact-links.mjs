import { load } from 'cheerio';
import { emailTopics } from '../data/contactPeople.server.mjs';

import {contactIcon} from './person-presentation.mjs';

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
    const formIcon = link.closest('.contact-icons, .coach-contacts, .staff-contact-icons').length && /\/kontakt(?:\?|$)/.test(link.attr('href') ?? '');
    if (phone || formIcon) {
      const originalLabel = link.attr('aria-label') || link.attr('title') || '';
      const phoneLabel = link.text().replace(/\+?\d[\d\s()/.-]{5,}\d/g, '').replace(/[↗☎:]/g, '').trim();
      const label = phone
        ? (originalLabel && !/\d/.test(originalLabel) ? originalLabel : phoneLabel ? `${phoneLabel} – telefonisch Kontakt aufnehmen` : 'Telefonisch Kontakt aufnehmen')
        : (/Kontaktformular/.test(originalLabel) ? originalLabel : originalLabel ? `${originalLabel.replace(/E-Mail an /, 'Nachricht an ')} – über das Kontaktformular` : 'Nachricht über das Kontaktformular schreiben');
      link.addClass(`contact-direct contact-action is-${phone ? 'phone' : 'email'}`)
        .attr('aria-label', label).attr('title', label).html(contactIcon(phone ? 'phone' : 'email'));
    }
  });
  // Shared portrait treatment also covers the imported board/committee cards.
  $('.staff-roster-portrait, .coach-portrait, .department-portrait, .referee-portrait, .referee-page .portrait, .quality-page .portrait').attr('data-profile-portrait', '');
  $('img.uk-border-circle7').attr('data-profile-portrait', '');
  $('[data-profile-portrait] img[src*="/transparent/"]').attr('data-profile-cutout', '');
  return $.html();
}
