const structures={
 board:[
  {title:'Fußball',match:/sportlich|spielbetrieb|passwesen/i,groups:[{title:'Herren',match:/herren/i},{title:'Frauen',match:/frauen/i},{title:'Alte Herren',match:/alte herren/i},{title:'Spielbetrieb',match:/spielbetrieb|passwesen/i}]},
  {title:'Jugendabteilung',match:/jugendleit/i},
  {title:'Breitensport',match:/bogensport|gymnastik|wander/i},
  {title:'Vereinspflege',match:/förder|qualifiz|mitglieder|ehrung|administr|datenschutz/i},
  {title:'Event',match:/einkauf|organisation|events?/i},
  {title:'Marketing & Kommunikation',match:/marketing|social media|presse/i},
  {title:'Facility Management',match:/platzwart|zeugwart|hausmeister|schlüssel|reinigung|fuhrpark/i},
 ],
 youth:[
  {title:'Jugendleitung',match:/jugendleit/i},
  {title:'Kasse',match:/kass|kasse/i},
  {title:'Jugendschutz',match:/schutz|elternvertret/i},
  {title:'Jugendvertreter',match:/jugendvertret/i},
  {title:'Organisation',match:/organisation|events?/i},
  {title:'Beisitzer',match:/passwesen|spielbetrieb|beisitz/i},
 ],
};
export function employeeSections(entries,group){
 const definitions=structures[group];if(!definitions)return [{title:'',entries}];
 const remaining=new Set(entries);const sections=definitions.map(definition=>{
  const members=entries.filter(entry=>remaining.has(entry)&&definition.match.test(entry.role));members.forEach(entry=>remaining.delete(entry));
  const section={title:definition.title,entries:members};
  if(definition.groups){const unassigned=new Set(members);section.groups=definition.groups.map(g=>{const list=members.filter(a=>unassigned.has(a)&&g.match.test(a.role)&&!(g.title==='Herren'&&/alte herren/i.test(a.role)));list.forEach(a=>unassigned.delete(a));return {title:g.title,entries:list};}).filter(g=>g.entries.length);if(unassigned.size)section.groups.push({title:'Weitere Aufgaben',entries:[...unassigned]});}
  return section;
 }).filter(section=>section.entries.length);
 if(remaining.size)sections.push({title:'Weitere Aufgaben',entries:[...remaining]});
 return sections;
}
export function employeeStructuredMarkup(entries,group,render){
 return employeeSections(entries,group).map(section=>'<section class="staff-role-section"><h3>'+section.title+'</h3>'+(section.groups?'<div class="staff-role-subgroups">'+section.groups.map(g=>'<section><h4>'+g.title+'</h4><div class="staff-roster-grid">'+render(g.entries)+'</div></section>').join('')+'</div>':'<div class="staff-roster-grid">'+render(section.entries)+'</div>')+'</section>').join('');
}
