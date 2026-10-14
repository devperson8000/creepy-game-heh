import test from 'node:test';
import assert from 'node:assert/strict';
import {stepPlayer} from '../src/controls.js';
test('walking is camera relative and diagonal movement does not increase speed',()=>{
 const p={x:0,z:4};
 const forward=stepPlayer(p,{forward:1,right:0},0,.1);
 assert.ok(forward.z<p.z);
 const turned=stepPlayer(p,{forward:1,right:0},Math.PI/2,.1);
 assert.ok(turned.x<p.x);
 const diagonal=stepPlayer(p,{forward:1,right:1},0,.1);
 assert.ok(Math.abs(Math.hypot(diagonal.x-p.x,diagonal.z-p.z)-Math.hypot(forward.x-p.x,forward.z-p.z))<1e-8);
});
test('room walls and creature prevent walking through them',()=>{
 let p={x:0,z:1};for(let i=0;i<300;i++)p=stepPlayer(p,{forward:1,right:0},0,.016);
 assert.ok(Math.hypot(p.x,p.z)>=.65);
 p={x:3,z:4};for(let i=0;i<300;i++)p=stepPlayer(p,{forward:0,right:1},0,.016);
 assert.ok(p.x<=3.15);
});
