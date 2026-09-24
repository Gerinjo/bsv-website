import { load } from 'cheerio';
import { emailTopics } from '../data/contactPeople.server.mjs';

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
  $('head').append('<meta name="format-detection" content="email=no">');
  $('a[href]').each((_, element) => {
    const link = $(element);
    const href = link.attr('href')?.trim() ?? '';
    if (/^mailto:/i.test(href)) {
      link.attr('href', contactHref(href, pathname, base));
      link.attr('data-contact-form', '');
      link.removeAttr('target');
      if (link.closest('.contact-icons').length) {
        link.addClass('contact-direct is-email').text('✉');
        const label = link.attr('aria-label') || link.attr('title') || 'E-Mail schreiben';
        link.attr('aria-label', `${label} – über das Kontaktformular`);
      }
    } else if (/^tel:/i.test(href) && link.closest('.contact-icons').length) {
      link.addClass('contact-direct is-phone').text('☎');
    }
  });
  return $.html();
}
