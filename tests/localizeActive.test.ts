import test from 'node:test';
import assert from 'node:assert/strict';
import {localizeActive} from '../src/mission/localizeActive.ts';
import type {Mission,Observation,MatchResult} from '../src/mission/types.ts';
const observation={id:'test-02',observed:[1,2,3],geometry:{samples:360}} as Observation;
const base={observation,index:{id:'references'},tests:[{id:'test-01'},{id:'test-02'}]} as Mission;
const result={test_id:'test-02',candidates:[{id:'78'}]} as MatchResult;
test('repeated dashboard runs keep T-02 and never generate or load T-01',async()=>{
 const calls:{path:string;body:unknown}[]=[];
 const api=async<T>(path:string,body?:unknown)=>{calls.push({path,body});return {result,truth:null} as T};
 const loaded=()=>assert.fail('Active observation must not be replaced');
 for(let i=0;i<2;i++){
  const matched=await localizeActive(base,api,loaded);
  assert.equal(matched.observation,observation);
 }
 assert.deepEqual(calls,Array(2).fill({path:'/localize',body:{test_id:'test-02',profile:[1,2,3]}}));
});
test('dashboard reuses manual samples and adopts the returned manual identity',async()=>{
 const manual={...observation,id:'manual-old',source:'manual' as const};
 const returned={...manual,id:'manual-new'};
 const api=async<T>(path:string,body?:unknown)=>{
  assert.equal(path,'/localize/manual');assert.deepEqual(body,{index_id:'references',profile:[1,2,3]});
  return {result:{...result,test_id:'manual-new'},truth:null,observation:returned} as T;
 };
 const matched=await localizeActive({...base,observation:manual},api,()=>assert.fail('Manual observation replaced'));
 assert.equal(matched.observation.id,matched.result.test_id);assert.equal(matched.truth,null);
});
test('only an empty mission loads the first available demo before matching',async()=>{
 const calls:string[]=[];
 const api=async<T>(path:string)=>{calls.push(path);return (path==='/skyline/generate'?observation:{result,truth:null}) as T};
 let loaded:Observation|undefined;
 await localizeActive({...base,observation:null},api,obs=>{loaded=obs});
 assert.deepEqual(calls,['/skyline/generate','/localize']);assert.equal(loaded,observation);
 await assert.rejects(localizeActive({...base,observation:null,tests:[]},api,()=>{}),/Generate reference/);
});
test('a failed match preserves the chosen input and never falls back to another demo',async()=>{
 const api=async<T>(_path:string):Promise<T>=>{throw new Error('Backend unavailable')};
 await assert.rejects(localizeActive(base,api,()=>assert.fail('Input changed')),/Backend unavailable/);
 assert.equal(base.observation?.id,'test-02');
});
