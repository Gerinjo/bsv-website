import test from 'node:test';import assert from 'node:assert/strict';
import {employeeSections} from '../src/utils/employee-structure.mjs';
import {employeeRosterMarkup,updateEmployeeRoster} from '../src/utils/employee-roster.mjs';
import {normalizeTeamStaffFeed} from '../src/utils/team-staff.mjs';
test('youth leadership, finance, protection, representation, organization and assessors retain all current people',()=>{
 const entries=['Jugendleiter','Stellvertretender Jugendleiter','Jugendkassiererin','Elternvertretung','Jugendschutzbeauftragte','Jugendvertretung G–D','Organisation','Sport Events','Passwesen','Neue Aufgabe'].map((role,i)=>({name:'Person '+i,role}));
 const groups=employeeSections(entries,'youth');assert.deepEqual(groups.map(g=>g.title),['Jugendleitung','Kasse','Jugendschutz','Jugendvertreter','Organisation','Beisitzer','Weitere Aufgaben']);assert.equal(groups.flatMap(g=>g.entries).length,entries.length);
});
test('board football areas and other departments preserve role assignment and unknown tasks',()=>{
 const entries=['Sportlicher Leiter Herren','Sportliche Leitung Frauen','Sportliche Leitung Alte Herren','Spielbetrieb','Passwesen','Abteilungsleiter Bogensport','IT & Administration','Marketing & Social Media','Hausmeister'].map(role=>({name:'Anna',role}));
 const groups=employeeSections(entries,'board');assert.deepEqual(groups[0].groups.map(g=>g.title),['Herren','Frauen','Alte Herren','Spielbetrieb']);assert.equal(groups[0].groups.find(g=>g.title==='Herren').entries.length,1);assert.equal(groups.flatMap(g=>g.entries).length,entries.length);
});
test('public employee contacts show only form and approved phone icons, and updates retain the structure',()=>{
 const feed=normalizeTeamStaffFeed({teams:[],employeeGroups:[{groupKey:'youth',name:'Anna',role:'Jugendleiter',email:'private@example.test',contactKey:'person-anna',phone:'+49 123456'}]});
 const entry=feed.employees.get('youth')[0],html=employeeRosterMarkup([entry],{withBase:path=>'/bsv'+path});
 assert.match(html,/href="\/bsv\/kontakt\?thema=person-anna"/);assert.match(html,/href="tel:\+49123456"/);assert.doesNotMatch(html,/mailto:|private@example/);
 const content={innerHTML:''},root={dataset:{staffGroup:'youth',structured:'true',basePath:'/bsv',contactPath:'/bsv/kontakt'},querySelector:()=>content};
 updateEmployeeRoster(root,feed);assert.match(content.innerHTML,/<h3>Jugendleitung<\/h3>/);assert.match(content.innerHTML,/person-anna/);
});
