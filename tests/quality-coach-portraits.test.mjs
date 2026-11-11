import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';
import { personCardMarkup } from '../src/utils/person-presentation.mjs';
import { qualityCoachPortraits, updateQualityCoachPortraits } from '../src/utils/quality-coach-portraits.mjs';

const signed = expires => `https://project.supabase.co/storage/v1/render/image/sign/portraits/coach.jpg?token=x.${Buffer.from(JSON.stringify({ exp: expires })).toString('base64url')}.x`;
const future = () => Math.floor(Date.now() / 1000) + 3600;
const feed = image => new Map([['jugend/u13-d1', [{ name: 'Anna Beispiel', image }]]]);

test('static quality cards keep permanent portraits and defer expiring links until the live feed loads', () => {
  for (const image of [signed(future()), signed(1)]) {
    const html = personCardMarkup({ name: 'Anna <Beispiel>', image }, { deferTemporaryImages: true });
    const $ = load(html);
    assert.equal($('[data-live-portrait]').attr('data-live-portrait'), 'Anna <Beispiel>');
    assert.equal($('img').length, 0);
    assert.equal($('[data-profile-portrait] span').text(), 'A<');
    assert.ok(!html.includes('token='));
    assert.equal($('h3').text(), 'Anna <Beispiel>');
  }
  const local = load(personCardMarkup({ name: 'Anna', image: '/images/coach.jpg' }, { deferTemporaryImages: true }));
  assert.equal(local('img').attr('src'), '/images/optimized/coach.jpg.w900.webp');
  assert.equal(local('[data-live-portrait]').length, 0);
});

test('quality cards refresh local portraits and missing images as well as temporary portraits', () => {
  for (const image of ['/images/coach.jpg', '', signed(future())]) {
    const $ = load(personCardMarkup({ name: 'Anna Beispiel', image }, { deferTemporaryImages: true, refreshPortraits: true }));
    assert.equal($('[data-live-portrait]').attr('data-live-portrait'), 'Anna Beispiel');
    assert.equal($('img').length, image === '/images/coach.jpg' ? 1 : 0);
  }
});

test('quality portraits only use current youth trainers and safe, unexpired image URLs', () => {
  const fresh = signed(future());
  const result = qualityCoachPortraits(new Map([
    ['jugend/u13-d1', [{ name: 'Anna', image: fresh }, { name: 'Expired', image: signed(1) }, { name: 'Unsafe', image: 'javascript:alert(1)' }]],
    ['jugend/u13-d2', [{ name: 'Anna', image: '/images/another-person.jpg' }]],
    ['fussball/herren/bezirksliga', [{ name: 'Adult', image: '/images/adult.jpg' }]],
  ]));
  assert.equal(result.get('Anna'), fresh);
  assert.equal(result.get('Expired'), '');
  assert.equal(result.get('Unsafe'), '');
  assert.equal(result.has('Adult'), false);
  assert.equal(qualityCoachPortraits(null), null);
});

function portraitDom(source) {
  const createElement = tag => ({ tag, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, getAttribute(key) { return this[key] ?? this.attributes[key] ?? null; } });
  let child = source ? Object.assign(createElement('img'), { src: source }) : createElement('span');
  const portrait = { dataset: { livePortrait: 'Anna Beispiel' }, ownerDocument: { createElement }, querySelector: () => child.tag === 'img' ? child : null, replaceChildren: node => { child = node; } };
  return { root: { querySelectorAll: () => [portrait] }, child: () => child };
}

test('a cached page restores portraits with a fresh URL and renews expired links', () => {
  const dom = portraitDom();
  const first = signed(future());
  assert.equal(updateQualityCoachPortraits(dom.root, feed(first)), true);
  assert.equal(dom.child().src, first);
  assert.equal(dom.child().alt, 'Anna Beispiel');
  const current = dom.child();
  updateQualityCoachPortraits(dom.root, feed(signed(future() + 600)));
  assert.equal(dom.child(), current, 'A fresh image should not be reloaded for a new token alone');
  current.src = signed(1);
  const refreshed = signed(future() + 900);
  updateQualityCoachPortraits(dom.root, feed(refreshed));
  assert.equal(dom.child().src, refreshed);
  assert.notEqual(dom.child(), current);
});

test('feed outages preserve loaded images and removed portraits return to initials', () => {
  const dom = portraitDom('/images/portrait.jpg');
  const current = dom.child();
  assert.equal(updateQualityCoachPortraits(dom.root, null), false);
  assert.equal(dom.child(), current);
  updateQualityCoachPortraits(dom.root, feed(''));
  assert.equal(dom.child().tag, 'span');
  assert.equal(dom.child().textContent, 'AB');
});

test('current portraits replace older local photos and preserve fallbacks for people absent from the feed', () => {
  const dom = portraitDom('/images/old-portrait.jpg');
  const original = dom.child();
  updateQualityCoachPortraits(dom.root, new Map());
  assert.equal(dom.child(), original);
  const current = signed(future());
  updateQualityCoachPortraits(dom.root, feed(current));
  assert.equal(dom.child().src, current);
  assert.notEqual(dom.child(), original);
});

test('a portrait on another youth team is used when the first assignment has none', () => {
  const current = signed(future());
  const portraits = qualityCoachPortraits(new Map([
    ['jugend/u13-d1', [{ name: 'Anna Beispiel', image: '' }]],
    ['jugend/u13-d2', [{ name: 'Anna Beispiel', image: current }]],
  ]));
  assert.equal(portraits.get('Anna Beispiel'), current);
});

test('a renewed portrait keeps the configured site base path for local images', () => {
  const dom = portraitDom();
  dom.root.dataset = { basePath: '/bsv/' };
  updateQualityCoachPortraits(dom.root, feed('/images/portrait.jpg'));
  assert.equal(dom.child().src, '/bsv/images/optimized/portrait.jpg.w900.webp');
});
