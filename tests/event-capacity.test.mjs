import assert from 'node:assert/strict';
import test from 'node:test';
import {eventCategorySoldOut} from '../src/utils/event-capacity.mjs';
import {GIRLS_CUP_EVENT} from '../supabase/functions/_shared/girls-cup-event.mjs';

test('sold out means confirmed tournament places are taken, regardless of waiting places',()=>{
 const confirmed={status:'confirmed'},waiting={status:'waiting'};
 assert.equal(eventCategorySoldOut({capacity:2,teams:[confirmed,waiting,waiting]}),false);
 assert.equal(eventCategorySoldOut({capacity:2,teams:[confirmed,confirmed]}),true);
 assert.equal(eventCategorySoldOut({capacity:2,teams:[confirmed,confirmed,waiting]}),true);
 assert.equal(eventCategorySoldOut({capacity:2,teams:[confirmed,confirmed,confirmed]}),true);
 for(const capacity of [null,undefined,0,-1,'2'])assert.equal(eventCategorySoldOut({capacity,teams:[confirmed,confirmed]}),false);
 assert.equal(eventCategorySoldOut({capacity:2}),false);assert.equal(eventCategorySoldOut(null),false);
});
test('each Girls Cup age group has exactly two waiting places while D retains ten tournament places',()=>{
 assert.equal(GIRLS_CUP_EVENT.divisions.D.capacity,10);
 for(const division of Object.values(GIRLS_CUP_EVENT.divisions))assert.equal(division.waitingCapacity,2);
});
