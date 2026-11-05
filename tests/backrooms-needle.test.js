import test from 'node:test';import assert from 'node:assert/strict';
import {createLevelZero,canWalkLevelZero} from '../src/backrooms-layout.js';
import {createNeedleSimulation} from '../src/backrooms-needle-state.js';
test('blind entity does not target a stationary visible player; footsteps target their last location',()=>{
 const map=createLevelZero(),s=createNeedleSimulation(map,{grace:0,spawn:{x:-5,z:3}}),player={x:-5,z:6};
 for(let i=0;i<30;i++)s.tick(.025,player);assert.equal(s.state.lastHeard,null);
 assert.ok(s.noise({...player,radius:12}));assert.deepEqual(s.state.lastHeard,player);
 player.x=30;player.z=20;for(let i=0;i<30;i++)s.tick(.025,player);assert.deepEqual(s.state.lastHeard,{x:-5,z:6});
});
test('grace and pause freeze the threat and catch requires real contact',()=>{
 const s=createNeedleSimulation(createLevelZero(),{grace:2}),p={...s.state.position};
 for(let i=0;i<10;i++)assert.equal(s.tick(.1,p).caught,false);assert.equal(s.noise({...p,radius:20}),false);
 assert.equal(s.tick(0,p).caught,false);for(let i=0;i<12;i++)s.tick(.1,p);assert.equal(s.state.caught,true);
});
test('routes and acceleration stay valid through walls and eventually leave stale noise',()=>{
 const map=createLevelZero(),s=createNeedleSimulation(map,{grace:0,spawn:{x:-5,z:3}});s.noise({x:-7,z:13,radius:30});let before={...s.state.position};
 for(let i=0;i<1400;i++){s.tick(.025,{x:39,z:28});const p=s.state.position;assert.ok(canWalkLevelZero(map,p.x,p.z,.4));assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<=8.5*.025+.0001);before={...p};}
 assert.equal(s.state.lastHeard,null);assert.ok(s.state.travel>5);
});
