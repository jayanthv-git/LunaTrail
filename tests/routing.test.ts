import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchRoutes} from 'react-router';
import {missionRoutes} from '../src/mission/routes.ts';
test('all eight mission URLs resolve distinctly and support deep links',()=>{
 assert.equal(missionRoutes.length,8);
 const routes=[{path:'/'},...missionRoutes];
 for(const route of missionRoutes){
  const match=matchRoutes(routes,route.path+'?test=held-out');
  assert.equal(match?.[0].route.path,route.path);
 }
 assert.equal(matchRoutes(routes,'/missing'),null);
 assert.equal(new Set(missionRoutes.map(r=>r.path)).size,8);
});
