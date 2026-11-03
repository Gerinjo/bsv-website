# Central club colors on the website

`src/utils/club-brand.mjs` derives the public website's CSS variables from the seven saved Suite colors. `ClubBrand.astro` applies the same variables during the static build and when the browser refreshes the public settings. Color selection and photographic motif selection remain independent.

Alongside the original `--bsv-green`, `--bsv-yellow` and hero variables, shared UI roles cover dark surfaces, muted text on light/dark panels, subtle backgrounds, borders and shadows. Header navigation and dropdowns, tournament cards and photo galleries, sponsor sections, home promotion cards, footer and shared page text consume these roles. New club UI colors should use these variables instead of adding fixed green shades. External partner artwork and photo colors are content assets.

Verification: `tests/club-brand.test.mjs` checks derived foreground contrast and palette behavior. Browser QA covers all eight Suite presets across the actual built homepage, including desktop dropdowns and mobile navigation. Browser settings feeds are mocked; QA never saves live club settings.
