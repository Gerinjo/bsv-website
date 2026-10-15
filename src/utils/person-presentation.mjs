import { optimizedImageUrl } from './optimized-images.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Client-safe: initial rendering and live roster updates use the same presentation.
export const contactIcon = kind => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${kind === 'phone' ? '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>' : '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>'}</svg>`;

export function personCardMarkup(person, { withBase = value => value, contactPath = '', cardClass = '', portraitClass = '', detailsClass = '', contactClass = '' } = {}) {
  const image = typeof person.image === 'string' && (/^https:\/\//.test(person.image) || /^\/(?!\/)/.test(person.image)) ? optimizedImageUrl(person.image, 900) : '';
  const phone = /^[+\d ()/.-]{3,50}$/.test(person.phone || '') ? person.phone : '';
  const initials = person.name === 'Noch nicht besetzt' ? '?' : person.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2);
  const action = (kind, href, label) => `<a class="contact-direct contact-action is-${kind}${kind === 'email' && contactClass ? ` ${escape(contactClass)}` : ''}" href="${escape(href)}" aria-label="${escape(label)}" title="${escape(label)}">${contactIcon(kind)}</a>`;
  const contacts = (contactPath ? action('email', contactPath, `Nachricht an ${person.name} über das Kontaktformular`) : '') + (phone ? action('phone', `tel:${phone.replace(/[^+\d]/g, '')}`, `${person.name} anrufen`) : '');
  return `<article data-person-card class="${escape(cardClass)}"><div data-profile-portrait class="${escape(portraitClass)}">${image ? `<img src="${escape(withBase(image))}" alt="${escape(person.name)}" width="480" height="600" loading="lazy" decoding="async"${image.includes('/transparent/') ? ' data-profile-cutout' : ''}>` : `<span aria-hidden="true">${escape(initials)}</span>`}</div><div data-person-details class="${escape(detailsClass)}"><small data-person-role>${escape(person.role)}</small><h3>${escape(person.name)}</h3>${person.qualification ? `<p>${escape(person.qualification)}</p>` : ''}${person.club ? `<p class="person-club"><small>Stammverein</small><strong>${escape(person.club)}</strong></p>` : ''}${person.teams?.length ? `<p>${escape(person.teams.join(' · '))}</p>` : ''}${contacts ? `<div class="contact-icons">${contacts}</div>` : ''}</div></article>`;
}
