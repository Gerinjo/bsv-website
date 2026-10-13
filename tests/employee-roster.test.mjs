import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeTeamStaffFeed} from '../src/utils/team-staff.mjs';
import {employeeRosterEntries,employeeRosterMarkup,updateEmployeeRoster} from '../src/utils/employee-roster.mjs';
test('public role circles use only names, functions and safe portrait links',()=>{
 const feed=normalizeTeamStaffFeed({teams:[],employeeGroups:[{groupKey:'youth',name:'Anna',role:'Jugendleitung',image:'javascript:evil',email:'private@example.org',personId:'private'}]});
 assert.deepEqual(feed.employees.get('youth'),[{name:'Anna',role:'Jugendleitung',image:''}]);
 const html=employeeRosterMarkup([{name:'<evil>',role:'Trainer',image:'javascript:evil'}],{contactPath:'/kontakt?thema=youth'});assert.doesNotMatch(html,/<evil>|javascript|mailto/);assert.match(html,/href="\/kontakt\?thema=youth"/);
});
test('executive and extended board views avoid repeated identical functions and honor an empty group',()=>{
 const a={name:'Anna',role:'1. Vorstand',image:'https://example.org/anna.png'};
 const feed=normalizeTeamStaffFeed({teams:[],employeeGroups:[{...a,groupKey:'executive'},{...a,groupKey:'board'},{...a,groupKey:'board',role:'Sportliche Leitung'}]});
 assert.deepEqual(employeeRosterEntries(feed,'board',true).map(a=>a.role),['Sportliche Leitung']);
 const grid={innerHTML:'old'},root={dataset:{staffGroup:'youth',basePath:'/bsv',contactPath:'/bsv/kontakt'},querySelector:()=>grid};
 assert.equal(updateEmployeeRoster(root,normalizeTeamStaffFeed({teams:[]})),false);assert.equal(grid.innerHTML,'old');assert.equal(updateEmployeeRoster(root,feed),true);assert.equal(grid.innerHTML,'');
});
