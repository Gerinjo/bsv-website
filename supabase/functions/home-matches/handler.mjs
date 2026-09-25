export const homeMatchWidgets = [
  'af96d999-a7ba-432a-87c5-439ab401516d',
  'a7855cb2-0226-49a3-98ca-b106b3786afb',
  '48130047-3237-4579-8f2e-a581bbb98097',
  '48107d01-3242-45df-8f09-55a20a959688',
];

// Public, read-only feed. It has no database access and only fetches these four widgets.
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
