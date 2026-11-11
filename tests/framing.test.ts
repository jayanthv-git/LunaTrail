import {test} from 'node:test';
import assert from 'node:assert/strict';
import {heroRegions,coverRegion} from '../src/lib/framing.ts';

test('desktop hero excludes baked navigation and fits all branded content',()=>{
 for(const [w,h] of [[1440,900],[1920,1080],[3440,1440],[1024,768]]){
  const [r]=heroRegions(1672,941,w,h);
  assert.ok(r.source.y>60);
  assert.ok(r.source.y<260);
  assert.equal(r.source.w,1672);
  assert.ok(r.destination.x>=0 && r.destination.y>=0);
  assert.ok(r.destination.x+r.destination.w<=w+.001);
  assert.ok(r.destination.y+r.destination.h<=h+.001);
  assert.ok(Math.abs(r.source.w/r.source.h-r.destination.w/r.destination.h)<1e-8);
 }
});
test('portrait hero uses source windows without baked text',()=>{
 for(const [w,h] of [[390,844],[375,667],[760,1024]]){
  const [sky,rover,foreground]=heroRegions(1672,941,w,h);
  assert.ok(sky.source.y>60 && sky.source.y+sky.source.h<260);
  assert.ok(rover.source.y>530 && rover.source.y+rover.source.h<765);
  assert.ok(foreground.source.y>835);
  for(const r of [sky,rover,foreground]){
   assert.ok(r.source.x>=0 && r.source.y>=0);
   assert.ok(r.source.x+r.source.w<=1672+.001);
   assert.ok(r.source.y+r.source.h<=941+.001);
   assert.ok(Math.abs(r.source.w/r.source.h-r.destination.w/r.destination.h)<1e-8);
  }
 }
});
test('cover crops symmetrically without distortion',()=>{
 const r=coverRegion({x:0,y:0,w:1600,h:900},{x:0,y:0,w:400,h:800});
 assert.equal(r.source.w,450);assert.equal(r.source.x,575);assert.equal(r.source.h,900);
});
