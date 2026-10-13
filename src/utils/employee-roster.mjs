const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImage=value=>typeof value==='string'&&(/^(https:\/\/)/.test(value)||/^\/(?!\/)/.test(value))?value:'';
export function employeeRosterEntries(feed,group,excludeExecutive=false){
 const entries=feed?.employees?.get(group);if(!entries)return null;
 const executive=feed.employees.get('executive')||[];
 return excludeExecutive?entries.filter(a=>!executive.some(e=>e.name===a.name&&e.role===a.role)):entries;
}
export function employeeRosterMarkup(entries,{withBase=value=>value,contactPath='/kontakt?thema=general'}={}){
 return entries.map(a=>{const image=safeImage(a.image);return '<article class="staff-roster-card"><div class="staff-roster-portrait">'+(image?'<img src="'+escape(withBase(image))+'" alt="'+escape(a.name)+'" width="480" height="640" loading="lazy">':'<span aria-hidden="true">'+escape(a.name==='Noch nicht besetzt'?'?':a.name.split(' ').map(n=>n[0]).join('').slice(0,2))+'</span>')+'</div><div class="staff-roster-copy"><small>'+escape(a.role)+'</small><h3>'+escape(a.name)+'</h3><a href="'+escape(contactPath)+'" aria-label="Kontakt zu '+escape(a.name)+' aufnehmen">✉</a></div></article>';}).join('');
}
export function updateEmployeeRoster(root,feed){
 const entries=employeeRosterEntries(feed,root.dataset.staffGroup,root.dataset.excludeExecutive==='true');if(entries===null)return false;
 root.querySelector('.staff-roster-grid').innerHTML=employeeRosterMarkup(entries,{contactPath:root.dataset.contactPath,withBase:path=>/^\/(?!\/)/.test(path)?(root.dataset.basePath||'').replace(/\/$/,'')+path:path});return true;
}
