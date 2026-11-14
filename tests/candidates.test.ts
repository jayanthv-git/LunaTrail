import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateRows} from '../src/mission/candidateRows.ts';
import type {Candidate} from '../src/mission/types.ts';
test('sorting top candidates preserves the best-scoring subset and original ranking',()=>{
 const rows=[{id:'324',rank:1},{id:'323',rank:2},{id:'148',rank:3},{id:'0',rank:4}] as Candidate[];
 assert.deepEqual(candidateRows(rows,false,2,'id').map(r=>r.id),['323','324']);
 assert.deepEqual(candidateRows(rows,true,2,'id').map(r=>r.id),['0','148','323','324']);
 assert.deepEqual(rows.map(r=>r.id),['324','323','148','0']);
 assert.deepEqual(candidateRows(rows,false,2,'score').map(r=>r.id),['324','323']);
});
