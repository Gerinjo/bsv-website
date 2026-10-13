export const TRAINER_FEED_URL='https://maejihwjzxkmthjavgnx.supabase.co/functions/v1/website-trainers-feed';
const escaped=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageUrl=value=>typeof value==='string'&&(/^(https:\/\/)/.test(value)||/^\/(?!\/)/.test(value))?value:'';
export function normalizeTeamStaffFeed(value){
 if(!value||!Array.isArray(value.teams))return null;const teams=Object.assign(new Map(),{photos:new Map()});
 for(const t of value.teams){if(!t||typeof t.path!=='string'||!Array.isArray(t.coaches)||teams.has(t.path))return null;const coaches=[];
  for(const c of t.coaches){if(!c||typeof c.name!=='string'||!c.name.trim()||typeof c.role!=='string')return null;coaches.push({name:c.name.trim(),role:c.role,qualification:String(c.qualification||''),club:String(c.club||''),image:imageUrl(c.image),phone:typeof c.phone==='string'&&/^[+\d ()/.-]{3,50}$/.test(c.phone)?c.phone:''});}
  teams.set(t.path,coaches);
  if(Object.hasOwn(t,'photo')){if(t.photo===null)teams.photos.set(t.path,null);else if(imageUrl(t.photo?.image))teams.photos.set(t.path,{image:imageUrl(t.photo.image)});}
 }return teams;
}
export async function fetchTeamStaff({fetcher=fetch,signal=AbortSignal.timeout(4000)}={}){try{const response=await fetcher(TRAINER_FEED_URL,{cache:'no-store',signal});return response.ok?normalizeTeamStaffFeed(await response.json()):null;}catch{return null;}}
let feedPromise;
export function loadTeamStaff(){return feedPromise??=fetchTeamStaff();}
export function teamStaffMarkup(coaches,{contactPath,withBase=value=>value}={}){
 return coaches.map(c=>{
  const image=imageUrl(c.image);const phone=/^[+\d ()/.-]{3,50}$/.test(c.phone||'')?c.phone:'';
  const initials=c.name.split(' ').map(p=>p[0]).join('');const contact=contactPath;
  return '<article class="coach-card">'+(image?'<div class="coach-portrait"><img src="'+escaped(withBase(image))+'" alt="'+escaped(c.name)+'" width="677" height="1000" loading="lazy"></div>':'<div class="coach-portrait coach-placeholder" aria-hidden="true">'+escaped(initials)+'</div>')+'<div class="coach-details"><small>'+escaped(c.role)+'</small><h3>'+escaped(c.name)+'</h3>'+(c.qualification?'<p>'+escaped(c.qualification)+'</p>':'')+(c.club?'<p class="coach-club"><small>Stammverein</small><strong>'+escaped(c.club)+'</strong></p>':'')+'<div class="contact-icons"><a class="team-contact-link" href="'+escaped(contact)+'" aria-label="Kontakt zu '+escaped(c.name)+' aufnehmen">✉</a>'+(phone?'<a href="tel:'+escaped(phone.replace(/[^+\d]/g,''))+'" aria-label="'+escaped(c.name)+' anrufen">☎</a>':'')+'</div></div></article>';
 }).join('');
}
export function updateTeamStaff(root,feed){
 const coaches=feed?.get(root.dataset.trainerPath);if(!coaches)return false;
 const grid=root.querySelector('.coach-grid');if(!grid)return false;
 grid.innerHTML=teamStaffMarkup(coaches,{contactPath:root.dataset.contactPath,withBase:path=>/^\/(?!\/)/.test(path)?(root.dataset.basePath||'').replace(/\/$/,'')+path:path});grid.classList.toggle('is-single',coaches.length===1);root.hidden=coaches.length===0;root.dataset.trainerSource='suite';return true;
}

export function updateTeamPhoto(root,feed){
 if(!feed?.photos?.has(root.dataset.teamPhotoPath))return false;
 const photo=feed.photos.get(root.dataset.teamPhotoPath),src=imageUrl(photo?.image);
 const title=root.dataset.teamPhotoTitle||'',letter=root.dataset.teamPhotoLetter||'';
 const url=/^\/(?!\/)/.test(src)?(root.dataset.basePath||'').replace(/\/$/,'')+src:src;
 root.innerHTML=(src?'<img src="'+escaped(url)+'" alt="Mannschaftsbild '+escaped(title)+'" width="900" height="650">':'<div class="team-image-placeholder" aria-label="Für '+escaped(title)+' ist noch kein Mannschaftsbild vorhanden"><small>BSV Nordstern</small><strong>'+escaped(letter)+'</strong><b>Teambild folgt</b></div>')+'<span>BSV · 1956</span>';
 for(const scope of root.getAttributeNames().filter(name=>name.startsWith('data-astro-cid-')))root.querySelectorAll('*').forEach(node=>node.setAttribute(scope,''));
 root.classList.toggle('is-team-placeholder',!src);return true;
}
