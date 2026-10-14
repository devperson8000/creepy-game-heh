import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigator,sweepMove} from '../src/navigation.js';
test('navigation routes around a solid cabinet instead of crossing it',()=>{
 const canMove=(x,z)=>x>=-3&&x<=3&&z>=-3&&z<=3&&!(Math.abs(x)<.9&&Math.abs(z)<.8);
 const nav=createNavigator(canMove,{minX:-3,maxX:3,minZ:-3,maxZ:3,spacing:.4});
 const route=nav.findPath({x:0,z:-2},{x:0,z:2});assert.ok(route.length>1);
 let p={x:0,z:-2};for(const target of route){const d=Math.hypot(target.x-p.x,target.z-p.z);for(let i=0;i<=Math.ceil(d/.05);i++){const f=i/Math.max(1,Math.ceil(d/.05));assert.ok(canMove(p.x+(target.x-p.x)*f,p.z+(target.z-p.z)*f));}p=target;}
 assert.ok(Math.hypot(p.x,p.z-2)<.1);
});
test('a large movement step cannot tunnel across a thin wall',()=>{
 const canMove=(x,z)=>!(x>.45&&x<.6);
 const p=sweepMove({x:0,z:0},{x:2,z:0},canMove);
 assert.ok(p.x<=.45);
});
