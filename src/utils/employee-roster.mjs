import {optimizedImageUrl,imageKey,imagesFresh} from './optimized-images.mjs';
import {employeeStructuredMarkup} from './employee-structure.mjs';
import {personCardMarkup} from './person-presentation.mjs';
export function employeeRosterEntries(feed,group,excludeExecutive=false){
 const entries=feed?.employees?.get(group);if(!entries)return null;
 const executive=feed.employees.get('executive')||[];
 return excludeExecutive?entries.filter(a=>!executive.some(e=>e.name===a.name&&e.role===a.role)):entries;
}
export function employeeRosterMarkup(entries,{withBase=value=>value,contactPath='/kontakt?thema=general'}={}){
 return entries.map(person=>personCardMarkup(person,{
  withBase,contactPath:/^person-[a-z0-9-]{1,150}$/.test(person.contactKey||'')?withBase('/kontakt?thema='+person.contactKey):contactPath,
  cardClass:'staff-roster-card',portraitClass:'staff-roster-portrait',detailsClass:'staff-roster-copy',
 })).join('');
}
export function employeeRosterKey(entries){return JSON.stringify(entries.map(a=>[a.name,a.role,imageKey(optimizedImageUrl(a.image||'',900)),a.phone||'',a.contactKey||'']));}
export function updateEmployeeRoster(root,feed){
 const entries=employeeRosterEntries(feed,root.dataset.staffGroup,root.dataset.excludeExecutive==='true');if(entries===null)return false;
 const key=employeeRosterKey(entries);if(root.dataset.rosterRenderKey===key&&imagesFresh(root))return true;root.dataset.rosterRenderKey=key;
 const options={contactPath:root.dataset.contactPath,withBase:path=>/^\/(?!\/)/.test(path)?(root.dataset.basePath||'').replace(/\/$/,'')+path:path};
 root.querySelector('[data-staff-content], .staff-roster-grid').innerHTML=root.dataset.structured==='true'?employeeStructuredMarkup(entries,root.dataset.staffGroup,list=>employeeRosterMarkup(list,options)):employeeRosterMarkup(entries,options);return true;
}
