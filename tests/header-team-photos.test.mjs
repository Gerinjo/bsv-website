import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseHeaderPhoto,applyHeaderPhoto,CLUB_HEADER_IMAGE} from '../src/utils/header-team-photos.mjs';
import {normalizeTeamStaffFeed} from '../src/utils/team-staff.mjs';
import {imageKey,optimizedImageUrl} from '../src/utils/optimized-images.mjs';
const profiles=[{path:'fussball/first',name:'Herren 1',image:'/images/first.jpg'},{path:'jugend/a',name:'U19',image:'/images/a.jpg'},{path:'jugend/b',name:'U17',image:'/images/b.jpg'}];
const feed=photos=>normalizeTeamStaffFeed({teams:Object.entries(photos).map(([path,photo])=>({path,coaches:[],photo}))});

test('team header always prefers its current central upload over a random team or stale archive',()=>{
 const selected=chooseHeaderPhoto(profiles,feed({'jugend/a':{image:'https://example.org/new.jpg'}}),{teamPath:'jugend/a',currentPath:'fussball/first',random:()=>0});
 assert.equal(selected.image,'https://example.org/new.jpg');assert.equal(selected.path,'jugend/a');assert.equal(selected.fallback,false);
});
test('overview headers choose randomly within their own area and retain the choice on refresh',()=>{
 assert.equal(chooseHeaderPhoto(profiles,null,{scope:'jugend',random:()=>0}).path,'jugend/a');
 assert.equal(chooseHeaderPhoto(profiles,null,{scope:'jugend',random:()=>0.999}).path,'jugend/b');
 assert.equal(chooseHeaderPhoto(profiles,null,{scope:'jugend',currentPath:'jugend/b',random:()=>0}).path,'jugend/b');
 assert.equal(chooseHeaderPhoto(profiles,null,{scope:'fussball',random:()=>0.999}).path,'fussball/first');
});
test('missing, removed and broken team images leave a clearly attributed fallback without reviving removed photos',()=>{
 const selected=chooseHeaderPhoto(profiles,feed({'jugend/a':null}),{teamPath:'jugend/a',scope:'jugend',random:()=>0});
 assert.equal(selected.path,'jugend/b');assert.equal(selected.name,'U17');assert.equal(selected.fallback,true);
 const other=chooseHeaderPhoto(profiles,feed({'jugend/a':null,'jugend/b':null}),{teamPath:'jugend/a',scope:'jugend'});assert.equal(other.path,'fussball/first');
 assert.equal(chooseHeaderPhoto(profiles,null,{exclude:profiles.map(p=>imageKey(optimizedImageUrl(p.image)))}).image,CLUB_HEADER_IMAGE);
 assert.equal(chooseHeaderPhoto([{path:'x',name:'X',image:'javascript:evil'}],null).image,CLUB_HEADER_IMAGE);
});
test('live header updates preserve the image node, current viewer source and fallback identity',()=>{
 let writes=0;const image={dataset:{},getAttribute:()=>'/bsv/images/optimized/a.jpg.w1800.webp',setAttribute(){writes++;}},label={},button={setAttribute(name,value){this[name]=value;}};
 const root={dataset:{basePath:'/bsv/'},querySelector(selector){return selector==='[data-header-image]'?image:selector==='[data-header-label]'?label:button;}};
 applyHeaderPhoto(root,{path:'jugend/a',name:'U19',image:'/images/a.jpg',fallback:false});
 assert.equal(writes,0);assert.equal(root.dataset.fullImage,'/bsv/images/optimized/a.jpg.w1800.webp');assert.equal(image.dataset.teamPhotoFallback,'false');
 applyHeaderPhoto(root,{path:'jugend/b',name:'U17',image:'/images/b.jpg',fallback:true});
 assert.equal(writes,1);assert.equal(root.dataset.currentTeamPath,'jugend/b');assert.equal(root.dataset.headerLabel,'U17');assert.equal(image.alt,'Mannschaftsbild U17');assert.equal(image.dataset.teamPhotoFallback,'true');
});
