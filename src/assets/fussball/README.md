# Fußballer für die Startseite

- Datei: `src/assets/fussball/hero-player.png` (PNG mit transparentem Hintergrund).
- Ausgangsbild: `public/images/fussball/teams-schuss.webp` aus dem Teams-Menü; unverändert erhalten.
- Bearbeitung: integriertes Imagegen-Werkzeug, Modus `background-extraction`, 25. September 2026.
- Einsatz: `src/pages/index.astro`, über dem gezeichneten Spielfeld und unter dem `#aufgehtsgrün`-Schild. Astro erzeugt beim Build WebP-Varianten mit erhaltenem Alphakanal.

Verwendeter Prompt:

> Use case: background-extraction. Edit target: the attached existing football player photo from the BSV website. Asset type: transparent cutout for the homepage hero, layered in front of a drawn football pitch. Remove ONLY the background and grass; isolate the exact same full football player AND the football at his feet, on a genuinely transparent background with alpha. Preserve the same face, dark hair, beard, body, kicking pose, arm positions, green jersey and socks, white shorts, shoes, lighting, textures and proportions as closely as possible. Keep the full body, both hands, both shoes and complete football uncut. Retain the portrait composition with a modest transparent margin; no crop into the subject. No grass, no field, no vignette, no new background, no opaque rectangle, no checkerboard painted into pixels, no text, no logos, no extra objects. High quality clean natural edges including hair and fingers.
