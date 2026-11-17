import test from 'node:test';
import assert from 'node:assert/strict';
import {createLevelZero,canWalkLevelZero} from '../src/backrooms-layout.js';
test('spawn and every reference area connect through traversable rooms',()=>{
 const map=createLevelZero(),step=.5,key=(x,z)=>`${x},${z}`,queue=[[map.spawn.x,map.spawn.z]],seen=new Set([key(...queue[0])]);
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz]of [[step,0],[-step,0],[0,step],[0,-step]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!seen.has(k)&&canWalkLevelZero(map,nx,nz)){seen.add(k);queue.push([nx,nz]);}}}
 for(const area of map.areas)assert.ok(queue.some(([x,z])=>Math.hypot(x-area.x,z-area.z)<1),area.name);
 assert.ok(queue.length>3000);
});
test('walls, columns, invalid coordinates and outer edges block the player',()=>{
 const map=createLevelZero();assert.ok(canWalkLevelZero(map,map.spawn.x,map.spawn.z));
 for(const wall of map.walls)assert.equal(canWalkLevelZero(map,wall.x,wall.z),false);
 for(const [x,z]of [[NaN,0],[Infinity,0],[-100,0],[100,0],[0,100]])assert.equal(canWalkLevelZero(map,x,z),false);
});


test('cinematic Level Zero moves the outer perimeter beyond view without changing the normal map',()=>{
 const normal=createLevelZero(),cinematic=createLevelZero({cinematic:true});
 assert.deepEqual(normal.bounds,{minX:-30,maxX:42,minZ:-42,maxZ:30});
 assert.ok(cinematic.bounds.minX<normal.bounds.minX-150);
 assert.ok(cinematic.bounds.maxX>normal.bounds.maxX+150);
 assert.ok(cinematic.bounds.minZ<normal.bounds.minZ-150);
 assert.ok(cinematic.bounds.maxZ>normal.bounds.maxZ+150);
 assert.deepEqual(cinematic.dustBounds,normal.bounds);
 for(const area of normal.areas)assert.ok(canWalkLevelZero(cinematic,area.x,area.z),area.name+' remains traversable');
 assert.ok(!cinematic.walls.some(w=>w.x===-30&&w.d===72),'old western border is removed');
 assert.ok(!cinematic.walls.some(w=>w.z===-42&&w.w===72),'old northern border is removed');
 assert.ok(cinematic.walls.some(w=>w.x===cinematic.bounds.minX),'new distant perimeter is present');
});
