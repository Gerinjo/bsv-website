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
