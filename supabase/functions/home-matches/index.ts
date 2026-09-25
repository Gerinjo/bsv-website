import { loadNextMatches } from '../_shared/football-matches.ts';
import { createHomeMatchesHandler } from './handler.mjs';

Deno.serve(createHomeMatchesHandler((widgetId: string) => loadNextMatches(widgetId, fetch, { throwOnError: true })));
