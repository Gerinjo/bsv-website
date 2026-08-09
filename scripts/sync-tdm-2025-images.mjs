import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const targetDir = path.resolve('public/images/events/tdm/2025');

const images = [
  {
    file: '01-gruppenfoto.jpg',
    url: 'https://bodensee.sbfv.de/fileadmin/_processed_/8/3/csm_Tag_des_Maedchenfussballs__1__-_Bild_Verein_a21765ab93.jpg',
  },
  {
    file: '02-trainingsgruppe.jpg',
    url: 'https://bodensee.sbfv.de/fileadmin/_processed_/4/6/csm_Tag_des_Maedchenfussballs__3__-_Bild_Verein_ff28794151.jpg',
  },
  {
    file: '03-stationen.jpg',
    url: 'https://bodensee.sbfv.de/fileadmin/_processed_/3/b/csm_Tag_des_Maedchenfussballs__5__-_Bild_Verein_13a61b1270.jpg',
  },
  {
    file: '04-teamrunde.jpg',
    url: 'https://bodensee.sbfv.de/fileadmin/_processed_/e/d/csm_Tag_des_Maedchenfussballs__6__-_Bild_Verein_ed1d6335eb.jpg',
  },
  {
    file: '05-technikstation.jpg',
    url: 'https://bodensee.sbfv.de/fileadmin/_processed_/7/b/csm_Tag_des_Maedchenfussballs__8__-_Bild_Verein_b1d7de4427.jpg',
  },
  {
    file: '06-training.jpg',
    url: 'https://bodensee.sbfv.de/fileadmin/_processed_/0/0/csm_Tag_des_Maedchenfussballs__10__-_Bild_Verein_fc3bf3f74b.jpg',
  },
  {
    file: '07-parcours.jpg',
    url: 'https://bodensee.sbfv.de/fileadmin/_processed_/2/3/csm_Tag_des_Maedchenfussballs__11__-_Bild_Verein_129eda59fc.jpg',
  },
];

await mkdir(targetDir, { recursive: true });

for (const image of images) {
  const response = await fetch(image.url, {
    headers: { 'User-Agent': 'BSV-Nordstern-Website/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Bild konnte nicht geladen werden (${response.status}): ${image.url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(targetDir, image.file), bytes);
  console.log(`gespeichert: ${image.file} (${bytes.length} Bytes)`);
}
