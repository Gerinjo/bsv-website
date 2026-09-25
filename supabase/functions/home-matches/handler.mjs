import { homeMatchWidgets } from '../_shared/home-match-groups.mjs';
export { homeMatchWidgets };

// Public, read-only feed. It has no database access and only fetches the configured widgets.
export function createHomeMatchesHandler(loadMatches, now = () => new Date()) {
  let cached;
  let expiresAt = 0;
  let pending;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=30, s-maxage=60',
    'X-Content-Type-Options': 'nosniff',
  };
  return async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { ...headers, Allow: 'GET, OPTIONS' } });
    if (!cached || now().getTime() >= expiresAt) {
      pending ??= (async () => {
        const results = await Promise.all(homeMatchWidgets.map(async (widgetId) => {
          try { return [widgetId, { available: true, matches: await loadMatches(widgetId) }]; }
          catch { return [widgetId, { available: false, matches: [] }]; }
        }));
        cached = { updatedAt: now().toISOString(), teams: Object.fromEntries(results) };
        expiresAt = now().getTime() + 60_000;
      })().finally(() => { pending = undefined; });
      await pending;
    }
    const available = Object.values(cached.teams).some((team) => team.available);
    return Response.json(cached, { status: available ? 200 : 503, headers: available ? headers : { ...headers, 'Cache-Control': 'no-store' } });
  };
}
