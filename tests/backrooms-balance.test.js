import test from 'node:test';
import assert from 'node:assert/strict';
import * as balance from '../src/backrooms-balance.js';
import {PITFALLS,gridX,gridZ,onPitBeam,canWalkPit} from '../src/backrooms-pitfalls.js';
const beamPlayer=()=>({x:gridX()[2],z:gridZ()[2]+1.6,y:0,yaw:0});
const step=(p,lean=0,dt=.025,canMove=(x,z)=>canWalkPit(x,z,p.y))=>balance.stepPitBalance(p,{lean},dt,{canMove});
function untilFall(p,control=()=>0,seconds=12){for(let t=0;t<seconds;t+=.025){step(p,control(p));if(p.balance.falling&&!onPitBeam(p.x,p.z))return t;}return Infinity;}

test('neglecting a narrow beam physically carries the player into a real shaft opening',()=>{
 const p=beamPlayer();assert.ok(untilFall(p)<10);assert.equal(p.balance.falling,true);assert.equal(onPitBeam(p.x,p.z),false);assert.equal(p.y,0);
});
test('opposing lean feedback can keep the player balanced for a long crossing',()=>{
 const p=beamPlayer();const result=untilFall(p,p=>-Math.sign((p.balance?.angle||0)*3+(p.balance?.velocity||0)*1.8),45);
 assert.equal(result,Infinity);assert.equal(p.balance.active,true);assert.ok(Math.abs(p.balance.angle)<.3);
});
test('leaning into the initial tilt falls faster than giving no input',()=>{
 const idle=untilFall(beamPlayer()),wrong=untilFall(beamPlayer(),()=>1);assert.ok(wrong<idle);assert.ok(Number.isFinite(wrong));
});
test('lower floors, outside grid, ladder and rope clear balance',()=>{
 for(const patch of [{y:-.4},{x:40},{climbing:true},{ropeClimb:true}]){const p=beamPlayer();step(p);Object.assign(p,patch);step(p);assert.equal(p.balance.active,false);assert.equal(p.balance.angle,0);assert.equal(p.balance.falling,false);}
 const p=beamPlayer();step(p);assert.equal(balance.resetPitBalance(p),p.balance);assert.equal(p.balance.phase,0);
});
test('intersections offer recovery, require balancing if lingered on, and restart risk on reentry',()=>{
 const p=beamPlayer();step(p);p.balance.angle=.5;p.balance.velocity=.2;p.z=gridZ()[2];
 for(let i=0;i<30;i++)step(p);assert.ok(Math.abs(p.balance.angle)<.25);assert.equal(p.balance.falling,false);
 assert.ok(untilFall(p)<12);
 const q=beamPlayer();step(q);q.balance.angle=.5;q.z=gridZ()[2];for(let i=0;i<30;i++)step(q);
 q.z=gridZ()[2]+1.6;assert.ok(untilFall(q)<10);
});
test('fall displacement checks every small segment and cannot pass a blocking collision',()=>{
 const p=beamPlayer(),start={x:p.x,z:p.z};const checked=[];
 for(let i=0;i<300;i++)step(p,1,.025,(x,z)=>{checked.push([x,z]);return false;});
 assert.equal(p.balance.falling,true);assert.deepEqual({x:p.x,z:p.z},start);assert.ok(checked.length>0);assert.ok(checked.every(([x,z])=>Math.hypot(x-start.x,z-start.z)<=.041));
});
test('large timesteps match the same fixed subdivision on separate simulation copies',()=>{
 const a=beamPlayer(),b=beamPlayer();step(a,0,.5);for(let i=0;i<20;i++)step(b);
 assert.ok(Math.abs(a.balance.angle-b.balance.angle)<1e-12);assert.ok(Math.abs(a.balance.velocity-b.balance.velocity)<1e-12);assert.ok(Math.abs(a.balance.phase-b.balance.phase)<1e-12);
});
