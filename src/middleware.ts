import { defineMiddleware } from 'astro:middleware';
import { routeContactLinks } from './utils/contact-links.mjs';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const html = routeContactLinks(await response.text(), context.url.pathname, import.meta.env.BASE_URL);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
