import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = new URL('../public/images/verein/wappen/bsv-nordstern.png', import.meta.url);
const render = size => sharp(source.pathname)
  .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 }).toBuffer();

await writeFile(new URL('../public/favicon.png', import.meta.url), await render(64));

// Embed the original crest so the SVG favicon needs no external image request.
const crest = await render(256);
await writeFile(new URL('../public/favicon.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><image width="256" height="256" href="data:image/png;base64,${crest.toString('base64')}" /></svg>\n`);

// ICO directory with PNG entries for small browser tabs and bookmarks.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(render));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + i * 16;
  header[entry] = sizes[i];
  header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([header, ...images]));
console.log('BSV favicons generated: SVG, 64px PNG, and 16/32/48px ICO.');
