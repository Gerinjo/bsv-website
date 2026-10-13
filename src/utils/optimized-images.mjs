// Local photo derivatives keep the full composition and transparent background.
export function optimizedImageUrl(value,width=1800){
 if(typeof value!=='string'||value.includes('/images/optimized/'))return value;
 const local=/^(?:\/[^?#]*)?\/images\/(.+\.(?:jpe?g|png|webp))$/i;
 let match=value.match(local);
 if(match)return value.slice(0,value.indexOf('/images/'))+'/images/optimized/'+match[1]+'.w'+width+'.webp';
 try{const url=new URL(value);if(!['bsvnordstern.de','www.bsvnordstern.de','gerinjo.github.io'].includes(url.hostname)||url.protocol!=='https:'||url.search||url.hash)return value;
 if(url.hostname==='gerinjo.github.io'&&!url.pathname.startsWith('/bsv-website/images/'))return value;
 match=url.pathname.match(local);if(!match)return value;url.pathname='/images/optimized/'+match[1]+'.w'+width+'.webp';url.hostname='bsvnordstern.de';return url.href;
 }catch{return value;}
}
function tokenData(value){try{const token=new URL(value,'https://bsvnordstern.de').searchParams.get('token');if(!token)return null;return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{return {};}}
export function imageKey(value){try{const url=new URL(value,'https://bsvnordstern.de');const data=tokenData(value);url.searchParams.delete('token');url.searchParams.sort();return url.href+JSON.stringify(data?.transformations||data?.transform||null);}catch{return String(value||'');}}
export function imageFresh(value,now=Date.now()){
 const data=tokenData(value);return !data||Number.isFinite(data.exp)&&data.exp*1000>now+300000;
}
export function imagesFresh(root){return !root.querySelectorAll||[...root.querySelectorAll('img')].every(img=>imageFresh(img.getAttribute('src')||''));}
