import test from 'node:test';
import assert from 'node:assert/strict';
import {createWaitingRoomScene} from '../src/waiting-room-scene.js';

test('waiting room arrival slots and central aisle are walkable',()=>{
 const room=createWaitingRoomScene();
 try{
  const positions=Array.from({length:4},(_,slot)=>room.spawn(slot));
  assert.equal(new Set(positions.map(p=>p.x)).size,4);
  for(const p of positions){assert.equal(p.z,3.5);assert.equal(p.y,1.65);assert.equal(p.yaw,0);assert.ok(room.canMove(p.x,p.z));}
  for(let z=-6;z<=6;z+=.25)assert.ok(room.canMove(0,z),`aisle at ${z}`);
 }finally{room.dispose();}
});

test('waiting room collision includes player radius, lockers, bench, terminal and sealed door',()=>{
 const room=createWaitingRoomScene();
 try{
  for(const [x,z] of [[5.76,0],[-5.76,0],[0,6.76],[0,-6.76],[Infinity,0],[0,NaN],[-5.1,2],[4.65,1],[-4.5,-3],[0,-6.5]])assert.equal(room.canMove(x,z),false,`${x},${z}`);
  for(const [x,z] of [[5.7,-2],[-4.6,2],[4.4,1],[-3.7,-3],[0,-6.2]])assert.equal(room.canMove(x,z),true,`${x},${z}`);
  assert.ok(Math.hypot(room.terminalPosition.x+3.3,room.terminalPosition.z+3)<2);
 }finally{room.dispose();}
});

test('waiting room updates without DOM or members, limits lights, and disposes independently',()=>{
 const room=createWaitingRoomScene();
 const lights=[];room.scene.traverse(o=>{if(o.isPointLight)lights.push(o);});
 assert.ok(lights.length<=4);
 room.update(.016,4,{members:[{name:'<script>visitor</script>',slot:2,ready:true}]});
 room.update(.016,5,null);
 assert.ok(lights.every(l=>Number.isFinite(l.intensity)&&l.intensity>0));
 room.dispose();room.dispose();assert.equal(room.scene.children.length,0);
});
