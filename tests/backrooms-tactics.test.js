import test from 'node:test';import assert from 'node:assert/strict';
import {createNeedleSimulation} from '../src/backrooms-needle-state.js';
import {createLevelZero,canWalkLevelZero} from '../src/backrooms-layout.js';
test('tactical monsters move during grace and avoid another creature without crossing walls',()=>{
 const map=createLevelZero(),a=createNeedleSimulation(map,{tactics:true,grace:40,spawn:{x:37,z:20}}),b=createNeedleSimulation(map,{tactics:true,grace:40,spawn:{x:37,z:16}});
 for(let i=0;i<800;i++){a.tick(.025,map.spawn,[b.state]);b.tick(.025,map.spawn,[a.state]);assert.ok(Math.hypot(a.state.position.x-b.state.position.x,a.state.position.z-b.state.position.z)>=1.4);for(const s of [a,b])assert.ok(canWalkLevelZero(map,s.state.position.x,s.state.position.z,.42));}
 assert.ok(a.state.travel>25);assert.equal(a.state.caught,false);
});
test('a hidden tactical monster arms an ambush before a fast, bounded chase and cooldown',()=>{
 const m=createLevelZero(),s=createNeedleSimulation(m,{tactics:true,grace:0,spawn:{x:-5,z:3},huntSpeed:11.2});
 s.noise({x:-5,z:6,radius:12});assert.equal(s.state.mode,'stalk');
 let ambush=false,chase=false;for(let i=0;i<1200;i++){s.tick(.025,{x:-5,z:6});ambush ||= s.state.mode==='ambush';chase ||= s.state.mode==='investigate';if(s.state.caught)break;}
 assert.ok(ambush);assert.ok(chase);assert.equal(s.state.scareCount,1);
});
test('chase expires into a cooldown that ignores fresh noise',()=>{
 const s=createNeedleSimulation(createLevelZero(),{tactics:true,grace:0,spawn:{x:37,z:20}});
 s.state.mode='investigate';s.noise({x:37,z:18,radius:30});
 for(let i=0;i<340;i++)s.tick(.025,{x:-7,z:13});
 assert.notEqual(s.state.mode,'investigate');assert.equal(s.noise({x:s.state.position.x,z:s.state.position.z,radius:30}),false);
});
test('fast opposing chases cannot pass through one another',()=>{
 const m=createLevelZero(),a=createNeedleSimulation(m,{tactics:true,grace:0,spawn:{x:37,z:20},huntSpeed:12}),b=createNeedleSimulation(m,{tactics:true,grace:0,spawn:{x:37,z:10},huntSpeed:12,bodyRadius:.6});
 a.state.mode=b.state.mode='investigate';a.noise({x:37,z:5,radius:50});b.noise({x:37,z:25,radius:50});
 for(let i=0;i<240;i++){a.tick(.025,null,[b.state]);b.tick(.025,null,[a.state]);assert.ok(Math.hypot(a.state.position.x-b.state.position.x,a.state.position.z-b.state.position.z)>=1.61);}
});
