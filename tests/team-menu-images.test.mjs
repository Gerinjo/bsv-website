import test from 'node:test';import assert from 'node:assert/strict';
import {updateTeamMenuImages} from '../src/utils/team-menu-images.mjs';
import {normalizeTeamStaffFeed} from '../src/utils/team-staff.mjs';
test('menu previews track central uploads and explicit removals while retaining unmanaged defaults',()=>{
 const links=['jugend/u19','jugend/u13-d3','fussball/herren/bezirksliga'].map(menuTeamPath=>({dataset:{menuTeamPath,menuImage:'default.jpg'}}));
 const root={dataset:{basePath:'/bsv/'},querySelectorAll:()=>links};
 const feed=normalizeTeamStaffFeed({teams:[{path:'jugend/u19',coaches:[],photo:{image:'https://example.org/team.jpg'}},{path:'jugend/u13-d3',coaches:[],photo:null},{path:'fussball/herren/bezirksliga',coaches:[]}]});
 assert.equal(updateTeamMenuImages(root,feed),2);assert.equal(links[0].dataset.menuImage,'https://example.org/team.jpg');assert.equal(links[1].dataset.menuImage,'');assert.equal(links[2].dataset.menuImage,'default.jpg');
 feed.photos.set('jugend/u19',{image:'/images/new.jpg'});updateTeamMenuImages(root,feed);assert.equal(links[0].dataset.menuImage,'/bsv/images/optimized/new.jpg.w900.webp');
 assert.equal(updateTeamMenuImages(root,null),0);assert.equal(links[0].dataset.menuImage,'/bsv/images/optimized/new.jpg.w900.webp');
});
