import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';
import { contactHref, routeContactLinks } from '../src/utils/contact-links.mjs';

test('email actions select the recipient and respect a deployment base path', () => {
  assert.equal(contactHref('MAILTO:Sandra.Fuchs%40bsvnordstern.de?subject=Frage', '/', '/bsv-website/'), '/bsv-website/kontakt?thema=person-sandra-fuchs');
  assert.equal(contactHref('mailto:info@bsvnordstern.de', '/', '/'), '/kontakt?thema=general');
  assert.equal(contactHref('mailto:unknown@example.org', '/', '/'), '/kontakt');
  assert.equal(contactHref('mailto:%broken', '/', '/'), '/kontakt');
});

test('people with multiple roles receive context-specific inquiries', () => {
  assert.equal(contactHref('mailto:Stefan.Gastaudo@bsvnordstern.de', '/jugend/torwarttraining'), '/kontakt?thema=goalkeeping');
  assert.equal(contactHref('mailto:Stefan.Gastaudo@bsvnordstern.de', '/jugend/jugendschiedsrichter'), '/kontakt?thema=referees');
  assert.equal(contactHref('mailto:verwaltung@bsvnordstern.de', '/abteilungen/gymnastik'), '/kontakt?thema=gymnastics');
  assert.equal(contactHref('mailto:verwaltung@bsvnordstern.de', '/verein/vorstandschaft'), '/kontakt?thema=membership');
});

test('rendered pages expose form links immediately and preserve telephone and script behavior', () => {
  const html = '<!doctype html><html><head><title>Kontakt</title></head><body><div class="contact-icons"><a href="mailto:kasse@bsvnordstern.de" aria-label="E-Mail an die Kasse" target="_blank"><i class="bi bi-envelope"></i></a><a href="tel:+491795111126" aria-label="Stefan anrufen">☎</a></div><a href="/kontakt?thema=team--jugend--u13-d3--trial">Probetraining</a><script>const email = "mailto:example@example.org";</script></body></html>';
  const $ = load(routeContactLinks(html, '/', '/bsv-website/'));
  assert.equal($('a[href^="mailto:"]').length, 0);
  assert.equal($('a.is-email').attr('href'), '/bsv-website/kontakt?thema=finance');
  assert.equal($('a.is-email').attr('target'), undefined);
  assert.match($('a.is-email').attr('aria-label'), /Kontaktformular/);
  assert.equal($('a.is-phone').attr('href'), 'tel:+491795111126');
  assert.equal($('a').last().attr('href'), '/kontakt?thema=team--jugend--u13-d3--trial');
  assert.equal($('script').text(), 'const email = "mailto:example@example.org";');
  assert.equal($('meta[name="format-detection"]').attr('content'), 'email=no');
});
