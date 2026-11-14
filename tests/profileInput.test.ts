import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProfile} from '../src/mission/profileInput.ts';
test('editable skyline accepts a complete finite angular profile',()=>{
 const values=Array.from({length:360},(_,i)=>Math.sin(i/10));
 assert.deepEqual(parseProfile(JSON.stringify(values),360),values);
});
test('editable skyline rejects malformed, incomplete and non-angular samples',()=>{
 for(const input of ['[1,','{}','[1,2]',JSON.stringify(Array(360).fill('1')),JSON.stringify(Array(360).fill(null)),JSON.stringify(Array(360).fill(91))])assert.throws(()=>parseProfile(input,360));
});
