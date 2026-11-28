import test from 'node:test';
import assert from 'node:assert/strict';
import * as balance from '../src/backrooms-balance.js';
import {PITFALLS,gridX,gridZ,onPitBeam,canWalkPit,pitMoveSpeed} from '../src/backrooms-pitfalls.js';
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

// ---- difficulty calibration: simulated crossings of the longest beam line, 300 s of reaction-time noise
const rng=seed=>()=>((seed=Math.imul(seed^0x6D2B79F5,1597334677)>>>0)/4294967296);
function crossing({delay,gain,noise,crouch,seed}){
 const r=rng(seed),p={x:gridX()[0]+.2,z:gridZ()[4],y:0,yaw:-Math.PI/2,speed:0,crouch};balance.resetPitBalance(p);
 const dt=1/60,hist=[],speed=crouch?1.6:2.1,goal=gridX().at(-1)-.2;
 for(let t=0;t<120;t+=dt){
  const b=p.balance;hist.push([b.angle,b.velocity]);const [a,v]=hist[Math.max(0,hist.length-1-Math.round(delay/dt))];
  const lean=Math.max(-1,Math.min(1,-(gain*(a*3+v*1.8))+(r()-.5)*noise));p.speed=speed;
  const nx=p.x+speed*dt;if(canWalkPit(nx,p.z,0))p.x=nx;
  balance.stepPitBalance(p,{lean,crouch,yaw:p.yaw},dt,{canMove:(x,z)=>canWalkPit(x,z,0)});
  if(p.balance.falling&&!onPitBeam(p.x,p.z))return false;if(p.x>=goal)return true;
 }
 return false;
}
const rate=(bot,crouch,n=120)=>{let ok=0;for(let s=1;s<=n;s++)if(crossing({...bot,crouch,seed:s}))ok++;return ok/n;};
test('the crossing is hard: hurrying fails, doing nothing fails, a careful crouch-walk by a good player gets across',()=>{
 assert.equal(rate({delay:.1,gain:0,noise:0},false),0,'no input never makes it');
 assert.ok(rate({delay:.28,gain:.7,noise:.55},false)<.1,'an ordinary player walking across almost always falls');
 assert.ok(rate({delay:.4,gain:.55,noise:.9},true)<.1,'a sloppy player falls even crouching');
 const average=rate({delay:.28,gain:.7,noise:.55},true);assert.ok(average>.2&&average<.85,'an average player crouching is on a knife edge: '+average);
 assert.ok(rate({delay:.12,gain:1,noise:.1},true)>.9,'precise play still gets across');
});
test('sprinting is not possible out on the beams',()=>{
 assert.equal(pitMoveSpeed(52.4,-16,0,true),pitMoveSpeed(52.4,-16,0,false));
 assert.ok(pitMoveSpeed(52.4,-16,0,true)<3);assert.ok(pitMoveSpeed(30,0,0,true)>9);
});
test('gusts replay identically for identical histories',()=>{
 const run=()=>{const p=beamPlayer();for(let i=0;i<800;i++)step(p,0,.016);return [p.balance.angle,p.balance.velocity,p.balance.exposure];};
 assert.deepEqual(run(),run());
});
