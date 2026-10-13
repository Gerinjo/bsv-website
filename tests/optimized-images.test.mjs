import test from 'node:test';import assert from 'node:assert/strict';
import {optimizedImageUrl,imageKey,imageFresh} from '../src/utils/optimized-images.mjs';
import {normalizeTeamStaffFeed,updateTeamStaff,teamStaffKey} from '../src/utils/team-staff.mjs';
import {updateEmployeeRoster,employeeRosterKey} from '../src/utils/employee-roster.mjs';
const signed=(path,exp,iat)=>'https://project.supabase.co/storage/v1/render/image/sign/'+path+'?token=x.'+Buffer.from(JSON.stringify({exp,iat,transformations:{width:900,quality:95}})).toString('base64url')+'.x';
test('local photos use display-sized WebP while SVG, GIF and external images keep their originals',()=>{
 assert.equal(optimizedImageUrl('/images/photo.png',900),'/images/optimized/photo.png.w900.webp');assert.equal(optimizedImageUrl('/bsv/images/photo.JPG'),'/bsv/images/optimized/photo.JPG.w1800.webp');
 for(const src of ['/images/logo.svg','/images/animated.gif','https://other.example/images/photo.jpg'])assert.equal(optimizedImageUrl(src),src);
 assert.equal(optimizedImageUrl('/images/optimized/photo.png.w900.webp'),'/images/optimized/photo.png.w900.webp');
});
test('signed image identity ignores token renewal but detects a new upload and token expiry',()=>{
 const a=signed('bucket/a.jpg',5000,10),b=signed('bucket/a.jpg',6000,20),c=signed('bucket/b.jpg',6000,20);
 assert.equal(imageKey(a),imageKey(b));assert.notEqual(imageKey(a),imageKey(c));assert.equal(imageFresh(a,1000),true);assert.equal(imageFresh(a,5000000),false);
});
test('unchanged trainer and staff rows retain rendered images instead of downloading again',()=>{
 const p={name:'Anna',role:'Trainer',image:signed('bucket/reuse.jpg',Math.floor(Date.now()/1000)+3600,10)};
 const grid={innerHTML:'rendered',classList:{toggle(){}}},root={dataset:{trainerPath:'team',staffRenderKey:teamStaffKey([p])},querySelector:()=>grid,querySelectorAll:()=>[{getAttribute:()=>p.image}]};
 assert.equal(updateTeamStaff(root,new Map([['team',[{...p,image:signed('bucket/reuse.jpg',Math.floor(Date.now()/1000)+3600,20)}]]])),true);assert.equal(grid.innerHTML,'rendered');
 const role={name:'Anna',role:'Vorstand',image:p.image},r={dataset:{staffGroup:'board',rosterRenderKey:employeeRosterKey([role])},querySelector:()=>grid,querySelectorAll:root.querySelectorAll};
 const feed=normalizeTeamStaffFeed({teams:[],employeeGroups:[{...role,groupKey:'board',image:signed('bucket/reuse.jpg',Math.floor(Date.now()/1000)+3600,30)}]});
 assert.equal(updateEmployeeRoster(r,feed),true);assert.equal(grid.innerHTML,'rendered');
 const changed=normalizeTeamStaffFeed({teams:[],employeeGroups:[{...role,groupKey:'board',image:'https://example.org/new.jpg'}]});updateEmployeeRoster(r,changed);assert.match(grid.innerHTML,/new.jpg/);
});
