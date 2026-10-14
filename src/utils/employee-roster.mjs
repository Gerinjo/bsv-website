import {optimizedImageUrl,imageKey,imagesFresh} from './optimized-images.mjs';
import {employeeStructuredMarkup} from './employee-structure.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImage=value=>typeof value==='string'&&(/^(https:\/\/)/.test(value)||/^\/(?!\/)/.test(value))?value:'';
export function employeeRosterEntries(feed,group,excludeExecutive=false){
 const entries=feed?.employees?.get(group);if(!entries)return null;
 const executive=feed.employees.get('executive')||[];
 return excludeExecutive?entries.filter(a=>!executive.some(e=>e.name===a.name&&e.role===a.role)):entries;
}
export function employeeRosterMarkup(entries,{withBase=value=>value,contactPath='/kontakt?thema=general'}={}){
 return entries.map(a=>{const image=optimizedImageUrl(safeImage(a.image),900),contact=/^person-[a-z0-9-]{1,150}$/.test(a.contactKey||'')?withBase('/kontakt?thema='+a.contactKey):contactPath,phone=/^[+\d ()/.-]{3,50}$/.test(a.phone||'')?a.phone:'';return '<article class="staff-roster-card"><div class="staff-roster-portrait">'+(image?'<img src="'+escape(withBase(image))+'" alt="'+escape(a.name)+'" width="480" height="640" loading="lazy" decoding="async">':'<span aria-hidden="true">'+escape(a.name==='Noch nicht besetzt'?'?':a.name.split(' ').map(n=>n[0]).join('').slice(0,2))+'</span>')+'</div><div class="staff-roster-copy"><small>'+escape(a.role)+'</small><h3>'+escape(a.name)+'</h3><div class="staff-contact-icons"><a href="'+escape(contact)+'" aria-label="Kontakt zu '+escape(a.name)+' aufnehmen">✉</a>'+(phone?'<a href="tel:'+escape(phone.replace(/[^+\d]/g,''))+'" aria-label="'+escape(a.name)+' anrufen">☎</a>':'')+'</div></div></article>';}).join('');
}
export function employeeRosterKey(entries){return JSON.stringify(entries.map(a=>[a.name,a.role,imageKey(optimizedImageUrl(a.image||'',900)),a.phone||'',a.contactKey||'']));}
export function updateEmployeeRoster(root,feed){
 const entries=employeeRosterEntries(feed,root.dataset.staffGroup,root.dataset.excludeExecutive==='true');if(entries===null)return false;
 const key=employeeRosterKey(entries);if(root.dataset.rosterRenderKey===key&&imagesFresh(root))return true;root.dataset.rosterRenderKey=key;
 const options={contactPath:root.dataset.contactPath,withBase:path=>/^\/(?!\/)/.test(path)?(root.dataset.basePath||'').replace(/\/$/,'')+path:path};
 root.querySelector('[data-staff-content], .staff-roster-grid').innerHTML=root.dataset.structured==='true'?employeeStructuredMarkup(entries,root.dataset.staffGroup,list=>employeeRosterMarkup(list,options)):employeeRosterMarkup(entries,options);return true;
}
