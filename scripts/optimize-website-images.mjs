import sharp from 'sharp';
import {readdir,mkdir,stat,readFile,writeFile} from 'node:fs/promises';
import {join,relative,dirname} from 'node:path';
const root=new URL('../public/images/',import.meta.url).pathname,output=join(root,'optimized');
await mkdir(output,{recursive:true});
async function scan(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name==='optimized')continue;const path=join(dir,entry.name);if(entry.isDirectory())result.push(...await scan(path));else if(/\.(jpe?g|png|webp)$/i.test(entry.name))result.push(path);}return result;}
const files=await scan(root);let before=0,small=0,large=0,index=0,unchanged=0;
const version='webp-q95-alpha100-rotate-contain-v1';
await Promise.all(Array.from({length:3},async()=>{
 while(index<files.length){const source=files[index++],s=await stat(source),key=relative(root,source),mark=join(output,key+'.json');before+=s.size;
 const variants=[900,1800].map(width=>({width,path:join(output,key+'.w'+width+'.webp')}));
 let cached=false;try{const state=JSON.parse(await readFile(mark,'utf8'));cached=state.version===version&&state.size===s.size&&state.mtime===s.mtimeMs;for(const v of variants)await stat(v.path);}catch{cached=false;}
 if(!cached){await mkdir(dirname(mark),{recursive:true});try{for(const v of variants){const image=sharp(source).rotate().resize({width:v.width,withoutEnlargement:true});const bytes=await image.webp({quality:95,alphaQuality:100,effort:5}).toBuffer();await writeFile(v.path,bytes);}}catch(error){unchanged++;console.error('Original unverändert verwendet: '+key);for(const v of variants)await writeFile(v.path,await readFile(source));}await writeFile(mark,JSON.stringify({version,size:s.size,mtime:s.mtimeMs}));}
 small+=(await stat(variants[0].path)).size;large+=(await stat(variants[1].path)).size;
 }
}));
console.log(JSON.stringify({photos:files.length,originalBytes:before,portraitAndPreviewBytes:small,largeDisplayBytes:large,quality:95,unchanged,originalsPreserved:true}));
