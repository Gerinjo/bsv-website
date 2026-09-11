import type { APIRoute } from 'astro';
import { withBase } from '../utils/paths';

export const GET: APIRoute = () => new Response(JSON.stringify({
  id: withBase('/'),
  name: 'BSV Nordstern Radolfzell',
  short_name: 'BSV Nordstern',
  description: 'Dein Verein immer dabei: Teams, Spielplan und Neuigkeiten des BSV Nordstern Radolfzell.',
  lang: 'de',
  start_url: withBase('/'),
  scope: withBase('/'),
  display: 'standalone',
  background_color: '#092f20',
  theme_color: '#092f20',
  icons: [
    { src: withBase('/icons/app-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: withBase('/icons/app-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: withBase('/icons/app-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    { name: 'Spielplan', url: withBase('/fussball/spielplan') },
    { name: 'Junge Sterne', url: withBase('/jugend') },
    { name: 'Kontakt', url: withBase('/kontakt') },
  ],
}), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } });
