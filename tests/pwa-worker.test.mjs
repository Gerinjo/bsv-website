import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function worker({ scope = 'https://example.org/', fetch = async () => new Response('fresh') } = {}) {
  const listeners = {};
  const deleted = [];
  const added = [];
  const opened = [];
  let claimed = false;
  let skipped = false;
  const context = {
    URL, Request, Response, fetch,
    caches: {
      open: async (name) => {
        opened.push(name);
        return {
          add: async (request) => added.push(request.url),
          match: async () => new Response('offline notice'),
        };
      },
      keys: async () => ['bsv-offline:/:v0', 'bsv-offline:/:v1', 'bsv-offline:/other/:v0', 'unrelated-cache'],
      delete: async (name) => deleted.push(name),
    },
    self: {
      registration: { scope },
      addEventListener: (name, handler) => { listeners[name] = handler; },
      skipWaiting: async () => { skipped = true; },
      clients: { claim: async () => { claimed = true; } },
    },
  };
  runInNewContext(source, context);
  const navigate = (overrides = {}) => {
    let response;
    listeners.fetch({
      request: { url: `${scope}jugend/u19`, method: 'GET', mode: 'navigate', ...overrides },
      respondWith: (value) => { response = value; },
    });
    return response;
  };
  const lifecycle = async (name) => {
    let work;
    listeners[name]({ waitUntil: (value) => { work = value; } });
    await work;
  };
  return { navigate, lifecycle, added, deleted, opened, state: () => ({ claimed, skipped }) };
}

test('prepares only the offline notice and respects a subdirectory deployment', async () => {
  const sw = worker({ scope: 'https://example.org/bsv/' });
  await sw.lifecycle('install');
  assert.deepEqual(sw.added, ['https://example.org/bsv/offline/']);
  assert.equal(sw.state().skipped, true);
});

test('updates remove only older caches owned by this app scope', async () => {
  const sw = worker();
  await sw.lifecycle('activate');
  assert.deepEqual(sw.deleted, ['bsv-offline:/:v0']);
  assert.equal(sw.state().claimed, true);
});

test('online pages and HTTP errors pass through without reading or writing cached content', async () => {
  for (const status of [200, 404, 503]) {
    const sw = worker({ fetch: async () => new Response('current server response', { status }) });
    const response = await sw.navigate();
    assert.equal(response.status, status);
    assert.equal(await response.text(), 'current server response');
    assert.deepEqual(sw.opened, []);
  }
});

test('a failed page connection receives the offline notice', async () => {
  const sw = worker({ fetch: async () => { throw new TypeError('offline'); } });
  assert.equal(await (await sw.navigate()).text(), 'offline notice');
});

test('forms, APIs, downloads, assets and other origins are never intercepted', () => {
  const sw = worker({ scope: 'https://example.org/bsv/' });
  for (const request of [
    { method: 'POST' },
    { mode: 'cors' },
    { mode: 'no-cors' },
    { url: 'https://example.org/bsv/api/contact' },
    { url: 'https://example.org/bsv/api' },
    { url: 'https://example.org/bsv/api/membership.php' },
    { url: 'https://example.org/bsv/dokumente/antrag.pdf' },
    { url: 'https://api.example.org/bsv/contact' },
    { url: 'https://example.org/other/' },
  ]) assert.equal(sw.navigate(request), undefined);
});
