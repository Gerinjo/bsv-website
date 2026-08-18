import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const analyticsSource = readFileSync(new URL('../src/components/UmamiAnalytics.astro', import.meta.url), 'utf8');
const configSource = readFileSync(new URL('../src/utils/umami.ts', import.meta.url), 'utf8');
const privacySource = readFileSync(new URL('../src/pages/datenschutz.astro', import.meta.url), 'utf8');
const workflowSource = readFileSync(new URL('../.github/workflows/deploy.yaml', import.meta.url), 'utf8');

test('Umami stays disabled until a website ID is configured', () => {
  assert.match(configSource, /enabled: websiteId\.length > 0 && scriptUrl\.length > 0/);
  assert.match(analyticsSource, /umami\.enabled &&/);
});

test('Umami uses the self-hosted Vercel instance by default', () => {
  assert.match(configSource, /https:\/\/bsv-nordstern-umami\.vercel\.app\/script\.js/);
  assert.doesNotMatch(configSource, /cloud\.umami\.is/);
});

test('Umami only tracks the production domains with privacy safeguards', () => {
  assert.match(analyticsSource, /data-domains="bsvnordstern\.de,www\.bsvnordstern\.de"/);
  assert.match(analyticsSource, /data-exclude-search="true"/);
  assert.match(analyticsSource, /data-do-not-track="true"/);
});

test('the production build and privacy page follow the Umami setting', () => {
  assert.match(workflowSource, /PUBLIC_UMAMI_WEBSITE_ID: \$\{\{ vars\.PUBLIC_UMAMI_WEBSITE_ID \}\}/);
  assert.match(privacySource, /umami\.enabled \?/);
  assert.match(privacySource, /Umami setzt keine Cookies/);
});
