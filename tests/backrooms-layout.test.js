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
