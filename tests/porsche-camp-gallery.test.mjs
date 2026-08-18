import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(new URL('../src/pages/erlebnis/porsche-maedchenfussballcamp.astro', import.meta.url), 'utf8');
const imageDirectory = new URL('../public/images/events/porsche-maedchenfussballcamp/2024/', import.meta.url);
const images = readdirSync(imageDirectory).filter((name) => name.endsWith('.webp')).sort();

test('Porsche camp gallery offers separate 2024 and 2023 tabs', () => {
  assert.match(pageSource, /year: '2024'/);
  assert.match(pageSource, /year: '2023'/);
  assert.match(pageSource, /role="tablist" aria-label="Campjahr auswählen"/);
  assert.match(pageSource, /data-porsche-gallery-panel/);
});

test('all five optimized 2024 camp images are included', () => {
  assert.equal(images.length, 5);
  for (const image of images) {
    const bytes = readFileSync(new URL(image, imageDirectory));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.ok(statSync(new URL(image, imageDirectory)).size < 500_000, `${image} ist größer als 500 KB`);
    assert.match(pageSource, new RegExp(image.replaceAll('.', '\\.')));
  }
});

test('gallery lightbox supports buttons and keyboard arrow navigation', () => {
  assert.match(pageSource, /aria-label="Vorheriges Bild"/);
  assert.match(pageSource, /aria-label="Nächstes Bild"/);
  assert.match(pageSource, /event\.key === 'ArrowLeft'/);
  assert.match(pageSource, /event\.key === 'ArrowRight'/);
  assert.match(pageSource, /showLightboxImage\(activeIndex - 1\)/);
  assert.match(pageSource, /showLightboxImage\(activeIndex \+ 1\)/);
});
