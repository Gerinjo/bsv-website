import {readdir,readFile,writeFile} from 'node:fs/promises';import {join} from 'node:path';
import {optimizedImageUrl} from '../src/utils/optimized-images.mjs';
const root=new URL('../dist/',import.meta.url).pathname;let images=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(entry.name.endsWith('.html')){
 const html=await readFile(path,'utf8');const optimized=html.replace(/<img\b[^>]*>/gi,tag=>{
  let result=tag.replace(/\ssrc=(['"])([^'"]+)\1/i,(attr,q,src)=>{const value=optimizedImageUrl(src,1800);if(value!==src)images++;return ' src='+q+value+q+(value!==src&&!/\bdata-original-src=/.test(tag)?' data-original-src='+q+src+q:'');});
  if(!/\bdecoding=/.test(result))result=result.replace(/\s*\/?\s*>$/,' decoding="async">');
  return result;
 });if(optimized!==html)await writeFile(path,optimized);
}}}
await walk(root);console.log('Optimierte Bildauslieferung für '+images+' lokale Bildreferenzen; Originale bleiben für Galerie und Download erhalten.');
