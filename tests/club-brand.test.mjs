import test from 'node:test';
import assert from 'node:assert/strict';
import {clubBrandColors,clubBrandVariables,clubBrandSettings,clubBrandRibbon,CLUB_BRAND_DEFAULT,CLUB_BRAND_PRIDE} from '../src/utils/club-brand.mjs';
test('public brand accepts only the seven color fields',()=>{
 assert.equal(clubBrandColors({...CLUB_BRAND_DEFAULT,panel:'red;display:none'}),null);
 assert.equal(clubBrandColors({panel:'#abcdef'}),null);
 assert.deepEqual(clubBrandColors({...CLUB_BRAND_DEFAULT,panel:'#ABCDEF',secret:'ignored'}),{...CLUB_BRAND_DEFAULT,panel:'#abcdef'});
});
test('website variables respond to the central club identity',()=>{
 const variables=clubBrandVariables({...CLUB_BRAND_DEFAULT,panel:'#204830',accent:'#aabbcc'});
 assert.equal(variables['--bsv-green'],'#204830');assert.equal(variables['--bsv-yellow'],'#aabbcc');
 assert.equal(variables['--bsv-accent-rgb'],'170 187 204');
 assert.equal(variables['--bsv-accent-dark'],'#83909d');
 assert.notEqual(variables['--bsv-green-dark'],variables['--bsv-green']);
 assert.equal(clubBrandVariables(null)['--bsv-green'],CLUB_BRAND_DEFAULT.panel);
});

test('the CSD color proposal displays six rainbow colors and removes the ribbon when returning to standard colors',()=>{
 const rainbow=clubBrandRibbon(CLUB_BRAND_PRIDE);assert.equal(rainbow.length,6);
 const variables=clubBrandVariables(CLUB_BRAND_PRIDE);assert.equal(variables['--bsv-ribbon-height'],'6px');
 for(const color of rainbow)assert.ok(variables['--bsv-ribbon'].includes(color));
 assert.equal(clubBrandVariables(CLUB_BRAND_DEFAULT)['--bsv-ribbon'],'none');assert.equal(clubBrandVariables(CLUB_BRAND_DEFAULT)['--bsv-ribbon-height'],'0px');
 assert.deepEqual(clubBrandRibbon({...CLUB_BRAND_PRIDE,panel:'url(evil)'}),[]);
});

test('public design accepts only known seasonal themes and valid colors',()=>{
 for(const theme of ['football','christmas','easter','summer','girls_day'])assert.equal(clubBrandSettings({theme_key:theme,color_scheme:CLUB_BRAND_DEFAULT}).theme_key,theme);
 assert.equal(clubBrandSettings({theme_key:'<script>',color_scheme:CLUB_BRAND_DEFAULT}).theme_key,'football');
 assert.deepEqual(clubBrandSettings(null),{theme_key:'football',color_scheme:CLUB_BRAND_DEFAULT});
});

test('a light BSV background uses dark hero text and links, while dark themes retain light text',()=>{
 const light=clubBrandVariables({...CLUB_BRAND_DEFAULT,background:'#f1f7f3',panel:'#1d6242',ink:'#173d2a'});
 assert.equal(light['--bsv-background'],'#f1f7f3');assert.equal(light['--bsv-hero-ink'],'#173d2a');assert.equal(light['--bsv-hero-muted'],'#1d6242');assert.equal(light['--bsv-hero-accent'],'#1d6242');
 assert.equal(clubBrandVariables(CLUB_BRAND_DEFAULT)['--bsv-hero-ink'],'#ffffff');
});

test('UI foreground, borders and dark surfaces follow each palette beyond the homepage hero',()=>{
 const luminance=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const schemes=[CLUB_BRAND_DEFAULT,{background:'#241234',panel:'#62328c',primary:'#75d6d0',accent:'#ffc85a',muted:'#e5c8f3',surface:'#fcf6ff',ink:'#251536'},{background:'#f1f7f3',panel:'#1d6242',primary:'#c9e3b1',accent:'#e7d36c',muted:'#deeadf',surface:'#ffffff',ink:'#173d2a'},CLUB_BRAND_PRIDE];
 for(const colors of schemes){
  const v=clubBrandVariables(colors);
  for(const [fg,bg] of [[v['--bsv-ui-muted'],colors.surface],[v['--bsv-on-panel-muted'],colors.panel],[v['--bsv-on-dark-muted'],v['--bsv-deep']]]){
   const l=[luminance(fg),luminance(bg)].sort((a,b)=>a-b);assert.ok((l[1]+.05)/(l[0]+.05)>=4.5,`${fg} on ${bg}`);
  }
  assert.equal(v['--bsv-hero-muted'],colors.background==='#f1f7f3'?colors.panel:colors.muted);
 }
 const girls=clubBrandVariables(schemes[1]);assert.equal(girls['--bsv-deep'],'#241234');assert.equal(girls['--bsv-shadow-rgb'],'98 50 140');assert.notEqual(girls['--bsv-border'],clubBrandVariables(CLUB_BRAND_DEFAULT)['--bsv-border']);
});
