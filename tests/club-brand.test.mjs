import test from 'node:test';
import assert from 'node:assert/strict';
import {clubBrandColors,clubBrandVariables,CLUB_BRAND_DEFAULT} from '../src/utils/club-brand.mjs';
test('public brand accepts only the seven color fields',()=>{
 assert.equal(clubBrandColors({...CLUB_BRAND_DEFAULT,panel:'red;display:none'}),null);
 assert.equal(clubBrandColors({panel:'#abcdef'}),null);
 assert.deepEqual(clubBrandColors({...CLUB_BRAND_DEFAULT,panel:'#ABCDEF',secret:'ignored'}),{...CLUB_BRAND_DEFAULT,panel:'#abcdef'});
});
test('website variables respond to the central club identity',()=>{
 const variables=clubBrandVariables({...CLUB_BRAND_DEFAULT,panel:'#204830',accent:'#aabbcc'});
 assert.equal(variables['--bsv-green'],'#204830');assert.equal(variables['--bsv-yellow'],'#aabbcc');
 assert.notEqual(variables['--bsv-green-dark'],variables['--bsv-green']);
 assert.equal(clubBrandVariables(null)['--bsv-green'],CLUB_BRAND_DEFAULT.panel);
});
