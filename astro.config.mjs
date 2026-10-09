// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://bsvnordstern.de',
    redirects: {
        '/cs': 'https://bsv-story-automatik.jerome-ernsberger.chatgpt.site/',
        '/raku': 'https://gerinjo.github.io/raku-plan-pages/',
    },
});
