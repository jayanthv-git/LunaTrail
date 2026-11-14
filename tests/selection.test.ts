import test from 'node:test';
import assert from 'node:assert/strict';
import {readSelection,writeSelection} from '../src/mission/selection.ts';
import type {Mission} from '../src/mission/types.ts';
test('candidate selection survives refresh but never crosses mission identity',()=>{
 const store=new Map<string,string>();
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>store.get(k)||null,setItem:(k:string,v:string)=>store.set(k,v)}});
 const data={index:{id:'index-a',points:[{id:'7'}]},observation:{id:'test-a'}} as unknown as Mission;
 writeSelection(data,'7');assert.equal(readSelection(data),'7');
 assert.equal(readSelection({...data,observation:{...data.observation!,id:'test-b'}}),'');
 assert.equal(readSelection({...data,index:{...data.index!,id:'index-b'}}),'');
 writeSelection(data,'missing');assert.equal(readSelection(data),'');
 store.set('lunatrail-candidate-selection','broken');assert.equal(readSelection(data),'');
 delete (globalThis as any).sessionStorage;
 assert.equal(readSelection(data),'');assert.doesNotThrow(()=>writeSelection(data,'7'));
});
