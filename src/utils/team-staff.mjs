import {optimizedImageUrl,imageKey,imageFresh,imagesFresh} from './optimized-images.mjs';
export const TRAINER_FEED_URL='https://maejihwjzxkmthjavgnx.supabase.co/functions/v1/website-trainers-feed';
const escaped=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageUrl=value=>typeof value==='string'&&(/^(https:\/\/)/.test(value)||/^\/(?!\/)/.test(value))?value:'';
export function normalizeTeamStaffFeed(value){
 if(!value||!Array.isArray(value.teams))return null;const teams=Object.assign(new Map(),{photos:new Map(),employees:new Map()});
 for(const t of value.teams){if(!t||typeof t.path!=='string'||!Array.isArray(t.coaches)||teams.has(t.path))return null;const coaches=[];
  for(const c of t.coaches){if(!c||typeof c.name!=='string'||!c.name.trim()||typeof c.role!=='string')return null;coaches.push({name:c.name.trim(),role:c.role,qualification:String(c.qualification||''),club:String(c.club||''),image:imageUrl(c.image),phone:typeof c.phone==='string'&&/^[+\d ()/.-]{3,50}$/.test(c.phone)?c.phone:''});}
  teams.set(t.path,coaches);
  if(Object.hasOwn(t,'photo')){if(t.photo===null)teams.photos.set(t.path,null);else if(imageUrl(t.photo?.image))teams.photos.set(t.path,{image:imageUrl(t.photo.image),previewImage:imageUrl(t.photo.previewImage)||imageUrl(t.photo.image)});}
 }
 if(Array.isArray(value.employeeGroups))for(const g of value.employeeGroups){
  if(!g||!['executive','board','youth','supporters'].includes(g.groupKey)||typeof g.name!=='string'||typeof g.role!=='string')return null;
  if(!teams.employees.has(g.groupKey))teams.employees.set(g.groupKey,[]);
  teams.employees.get(g.groupKey).push({name:g.name,role:g.role,image:imageUrl(g.image)});
 }
 if(Array.isArray(value.employeeGroups))for(const key of ['executive','board','youth','supporters'])if(!teams.employees.has(key))teams.employees.set(key,[]);
 return teams;
}
async function requestTeamStaff({fetcher=fetch,signal=AbortSignal.timeout(4000)}={}){try{const response=await fetcher(TRAINER_FEED_URL,{cache:'no-store',signal});return response.ok?normalizeTeamStaffFeed(await response.json()):null;}catch{return null;}}
let pendingFeed;
export function fetchTeamStaff(options){if(options)return requestTeamStaff(options);return pendingFeed??=requestTeamStaff().finally(()=>{pendingFeed=undefined;});}
let feedPromise;
export function loadTeamStaff(){return feedPromise??=fetchTeamStaff();}
export function teamStaffMarkup(coaches,{contactPath,withBase=value=>value}={}){
 return coaches.map(c=>{
  const image=optimizedImageUrl(imageUrl(c.image),900);const phone=/^[+\d ()/.-]{3,50}$/.test(c.phone||'')?c.phone:'';
  const initials=c.name.split(' ').map(p=>p[0]).join('');const contact=contactPath;
  return '<article class="coach-card">'+(image?'<div class="coach-portrait"><img src="'+escaped(withBase(image))+'" alt="'+escaped(c.name)+'" width="677" height="1000" loading="lazy" decoding="async"></div>':'<div class="coach-portrait coach-placeholder" aria-hidden="true">'+escaped(initials)+'</div>')+'<div class="coach-details"><small>'+escaped(c.role)+'</small><h3>'+escaped(c.name)+'</h3>'+(c.qualification?'<p>'+escaped(c.qualification)+'</p>':'')+(c.club?'<p class="coach-club"><small>Stammverein</small><strong>'+escaped(c.club)+'</strong></p>':'')+'<div class="contact-icons"><a class="team-contact-link" href="'+escaped(contact)+'" aria-label="Kontakt zu '+escaped(c.name)+' aufnehmen">✉</a>'+(phone?'<a href="tel:'+escaped(phone.replace(/[^+\d]/g,''))+'" aria-label="'+escaped(c.name)+' anrufen">☎</a>':'')+'</div></div></article>';
 }).join('');
}
export function teamStaffKey(coaches){return JSON.stringify(coaches.map(c=>[c.name,c.role,c.qualification||'',c.club||'',imageKey(optimizedImageUrl(c.image||'',900)),c.phone||'']));}
export function updateTeamStaff(root,feed){
 const coaches=feed?.get(root.dataset.trainerPath);if(!coaches)return false;
 const grid=root.querySelector('.coach-grid');if(!grid)return false;
 const key=teamStaffKey(coaches);if(root.dataset.staffRenderKey===key&&imagesFresh(root))return true;root.dataset.staffRenderKey=key;
 grid.innerHTML=teamStaffMarkup(coaches,{contactPath:root.dataset.contactPath,withBase:path=>/^\/(?!\/)/.test(path)?(root.dataset.basePath||'').replace(/\/$/,'')+path:path});grid.classList.toggle('is-single',coaches.length===1);root.hidden=coaches.length===0;root.dataset.trainerSource='suite';return true;
}

export function updateTeamPhoto(root,feed){
 if(!feed?.photos?.has(root.dataset.teamPhotoPath))return false;
 const photo=feed.photos.get(root.dataset.teamPhotoPath),src=optimizedImageUrl(imageUrl(photo?.image));
 const title=root.dataset.teamPhotoTitle||'',letter=root.dataset.teamPhotoLetter||'';
 const url=/^\/(?!\/)/.test(src)?(root.dataset.basePath||'').replace(/\/$/,'')+src:src;
 const current=root.querySelector?.('img');if(current&&imageKey(current.getAttribute('src'))===imageKey(url)&&imageFresh(current.getAttribute('src')))return true;
 root.innerHTML=(src?'<img src="'+escaped(url)+'" alt="Mannschaftsbild '+escaped(title)+'" width="900" height="650" decoding="async">':'<div class="team-image-placeholder" aria-label="Für '+escaped(title)+' ist noch kein Mannschaftsbild vorhanden"><small>BSV Nordstern</small><strong>'+escaped(letter)+'</strong><b>Teambild folgt</b></div>')+'<span>BSV · 1956</span>';
 for(const scope of root.getAttributeNames().filter(name=>name.startsWith('data-astro-cid-')))root.querySelectorAll('*').forEach(node=>node.setAttribute(scope,''));
 root.classList.toggle('is-team-placeholder',!src);return true;
}
