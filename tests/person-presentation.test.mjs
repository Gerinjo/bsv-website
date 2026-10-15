import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {employeeRosterMarkup,updateEmployeeRoster} from '../src/utils/employee-roster.mjs';
import {teamStaffMarkup,updateTeamStaff} from '../src/utils/team-staff.mjs';
import {routeContactLinks} from '../src/utils/contact-links.mjs';

const person={name:'Anna Beispiel',role:'Ansprechperson',image:'/images/portrait.jpg',phone:'+49 123456'};
const contactPath='/bsv/kontakt?thema=general';
function presentation(html){
 const $=load(html),card=$('[data-person-card]');
 assert.equal(card.length,1);
 assert.equal(card.find('[data-profile-portrait] img').length,1);
 assert.equal(card.find('[data-person-details] > [data-person-role]').text(),person.role);
 assert.equal(card.find('[data-person-details] > h3').text(),person.name);
 assert.equal(card.find('a.contact-action svg').length,2);
 assert.equal(card.find('a.is-phone').attr('href'),'tel:+49123456');
 assert.equal(card.find('a.is-email').attr('href'),contactPath);
 assert.doesNotMatch(card.text(),/✉|☎/);
 return card.find('a').map((_,node)=>({href:$(node).attr('href'),label:$(node).attr('aria-label'),svg:$(node).html()})).get();
}

test('staff and trainers keep identical portraits and accessible SVG actions before and after live updates',()=>{
 const staff=employeeRosterMarkup([person],{contactPath});
 const trainer=teamStaffMarkup([person],{contactPath});
 assert.deepEqual(presentation(staff),presentation(trainer));
 for(const html of [staff,trainer])assert.deepEqual(presentation(routeContactLinks(html,'/','/bsv/')),presentation(html));
 const content={innerHTML:'',classList:{toggle(){}}};
 const root={dataset:{staffGroup:'youth',trainerPath:'jugend/u15-c1',basePath:'/bsv',contactPath},querySelector:()=>content};
 updateEmployeeRoster(root,{employees:new Map([['youth',[person]]])});
 const staffActions=presentation(content.innerHTML);
 updateTeamStaff(root,new Map([['jugend/u15-c1',[person]]]));
 assert.deepEqual(staffActions,presentation(content.innerHTML));
});

test('imported staff icon groups also receive the same SVG actions',()=>{
 const $=load(routeContactLinks('<div class="staff-contact-icons"><a href="/kontakt?thema=general">✉</a><a href="tel:+49123456">☎</a></div>','/','/'));
 assert.equal($('a.contact-action svg').length,2);
});
