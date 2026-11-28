import test from 'node:test';
import assert from 'node:assert/strict';
import {ROPE,ROPE_CLIMB_SECONDS,THROW,throwPose,ropeStand,openingCells,ropeCandidates,planRope,ropeClimbPose,ropeHands,ropePoints,ropeBar,ropeTop,ropeGrabOk} from '../src/monochrome2-rope.js';
import {PITFALLS as P,gridX,gridZ,onPitBeam,canWalkPit} from '../src/backrooms-pitfalls.js';

const beamSpots=()=>{const out=[];for(const x of gridX().slice(0,-1))for(const z of gridZ())for(const f of [0,.25,.5,.75])out.push({x:x+f*3.2,z});for(const z of gridZ().slice(0,-1))for(const x of gridX())for(const f of [.25,.5,.75])out.push({x,z:z+f*3.2});return out.filter(p=>onPitBeam(p.x,p.z));};
const cellOf=(x,z)=>openingCells().find(c=>x>=c.x0-1e-9&&x<=c.x1+1e-9&&z>=c.z0-1e-9&&z<=c.z1+1e-9);

test('rope plan: from almost any beam spot a rope hangs inside an opening, away from every shaft wall, over walkable floor',()=>{
 let planned=0,total=0;
 for(const spot of beamSpots()){total++;const plan=planRope(spot,{x:spot.x,z:spot.z+1.2});if(!plan)continue;planned++;
  const c=cellOf(plan.hang.x,plan.hang.z);assert.ok(c,'hang is inside an opening');
  for(const d of [plan.hang.x-c.x0,c.x1-plan.hang.x,plan.hang.z-c.z0,c.z1-plan.hang.z])assert.ok(d>=ROPE.inset-1e-9,'hang is '+d+' from a wall');
  assert.equal(canWalkPit(plan.hang.x,plan.hang.z,P.floorY),true);assert.ok(Math.hypot(spot.x-plan.lip.x,spot.z-plan.lip.z)<=ROPE.reach+1e-9,'rescuer reaches the lip');
  const top=ropeTop(plan);assert.equal(onPitBeam(top.x,top.z),true,'climber lands on a beam at '+JSON.stringify(top));}
 assert.ok(planned/total>.75,'most beam spots can lower a rope: '+planned+'/'+total);
});

test('climb: the body never enters a shaft wall, never jumps, and ends standing on the beam',()=>{
 let checked=0;
 for(const spot of beamSpots().filter((_,i)=>i%7===0)){
  const plan=planRope(spot,{x:spot.x+.5,z:spot.z+.5});if(!plan)continue;
  const victim={x:plan.hang.x+.6,z:plan.hang.z+(plan.outward.z?0:.6)};if(!ropeGrabOk(plan,victim))continue;checked++;
  const c=cellOf(plan.hang.x,plan.hang.z);let prev=null;
  for(let t=0;t<=ROPE_CLIMB_SECONDS+1e-9;t+=1/120){
   const p=ropeClimbPose(plan,t,victim);
   if(p.y<-.001&&p.y>P.floorY+.001||p.phase==='climb'||p.phase==='lift'){ // feet below the beam tops: the whole body must sit inside the opening
    for(const [dx,dz] of [[0,0],[.22,0],[-.22,0],[0,.22],[0,-.22]]){const x=p.x+dx,z=p.z+dz;assert.ok(x>=c.x0-1e-9&&x<=c.x1+1e-9&&z>=c.z0-1e-9&&z<=c.z1+1e-9,`body in a wall at t=${t.toFixed(2)} ${p.phase} ${x.toFixed(2)},${z.toFixed(2)}`);}
   }
   if(p.phase==='slide')assert.ok(p.y>=-1e-9,'legs are above the beam before sliding over it');
   if(p.phase==='foot')for(const [dx,dz] of [[0,0]])assert.equal(canWalkPit(p.x,p.z,P.floorY),true,'walks to the rope over open floor');
   if(prev)assert.ok(Math.hypot(p.x-prev.x,p.y-prev.y,p.z-prev.z)<.025,`jump of ${Math.hypot(p.x-prev.x,p.y-prev.y,p.z-prev.z)} at ${t.toFixed(2)} ${p.phase}`);
   prev=p;
  }
  const end=ropeClimbPose(plan,ROPE_CLIMB_SECONDS,victim),top=ropeTop(plan);
  assert.ok(Math.hypot(end.x-top.x,end.z-top.z)<1e-9&&Math.abs(end.y)<1e-9&&end.done);
 }
 assert.ok(checked>10,'enough cases checked: '+checked);
});

test('climb: head room - the camera never reaches the ceiling while lifting',()=>{
 const spot={x:57.5,z:-16},plan=planRope(spot,{x:58,z:-12});
 for(let t=0;t<=ROPE_CLIMB_SECONDS;t+=.01)assert.ok(ropeClimbPose(plan,t,{x:plan.hang.x+.6,z:plan.hang.z}).y+1.7<P.ceilingY-.2);
});

test('rope geometry: bar sits on the beam, the rope hangs from its tip to the floor, and sway is bounded and settles',()=>{
 const plan=planRope({x:57.5,z:-16},{x:58,z:-12}),bar=ropeBar(plan);
 assert.equal(onPitBeam(bar.from.x,bar.from.z),true);assert.equal(bar.to.x,plan.hang.x);assert.equal(bar.to.z,plan.hang.z);
 const pts=ropePoints(plan,3.3,1,0);assert.equal(pts.length,17);assert.ok(Math.abs(pts[0].x-bar.to.x)<1e-9&&Math.abs(pts[0].y-ROPE.barY)<1e-9);assert.ok(pts.at(-1).y<P.floorY+.1);
 const c=cellOf(plan.hang.x,plan.hang.z);for(let t=0;t<20;t+=.1)for(const p of ropePoints(plan,t,1,0)){assert.ok(p.x>c.x0&&p.x<c.x1&&p.z>c.z0&&p.z<c.z1,'rope stays inside the opening');}
 const unrolled=ropePoints(plan,1,.4,0);assert.ok(unrolled.at(-1).y>P.floorY+2,'a half-unrolled rope has not reached the floor');
 const calm=Math.max(...[...Array(50)].map((_,i)=>Math.hypot(...(([a,b])=>[a.x-b.x,a.z-b.z])([ropePoints(plan,i*.1,1,1).at(-1),{x:plan.hang.x,z:plan.hang.z}]))));
 const loose=Math.max(...[...Array(50)].map((_,i)=>Math.hypot(...(([a,b])=>[a.x-b.x,a.z-b.z])([ropePoints(plan,i*.1,1,0).at(-1),{x:plan.hang.x,z:plan.hang.z}]))));assert.ok(calm<loose&&loose<.1);
});

test('rope hands: grip the rope only while climbing, always on the rope line, alternating',()=>{
 const plan=planRope({x:57.5,z:-16},{x:58,z:-12});
 assert.equal(ropeHands(plan,.2,P.floorY),null);assert.equal(ropeHands(plan,ROPE_CLIMB_SECONDS-.1,0),null);
 const a=ropeHands(plan,2,-3),b=ropeHands(plan,2.3,-3);assert.ok(a&&b);assert.equal(a.left.x,plan.hang.x);assert.equal(a.right.z,plan.hang.z);assert.ok(a.left.y!==a.right.y);assert.ok(a.left.y<=ROPE.barY+.02);
});

test('climb: the climber hangs beside the rope, not on it, and the rope stays in front of them',()=>{
 const plan=planRope({x:57.5,z:-16},{x:58,z:-12}),stand=ropeStand(plan),mid=ropeClimbPose(plan,ROPE.foot+ROPE.climb/2,{x:stand.x,z:stand.z});
 assert.ok(Math.abs(Math.hypot(mid.x-plan.hang.x,mid.z-plan.hang.z)-.3)<1e-9);
 assert.ok((plan.hang.x-mid.x)*plan.outward.x+(plan.hang.z-mid.z)*plan.outward.z>.29,'the rope is on the lip side of the climber');
});
test('throw: the hand starts and ends low and out of sight, releases the coil once, and moves smoothly',()=>{
 let prev=null,released=0,last=true;
 for(let t=0;t<=ROPE.throwSeconds+1e-9;t+=1/120){const p=throwPose(t);if(prev){assert.ok(Math.hypot(p.pos.x-prev.pos.x,p.pos.y-prev.pos.y,p.pos.z-prev.pos.z)<.02,'throw jump at '+t.toFixed(2));if(prev.coil&&!p.coil)released++;}prev=p;last=p.coil;}
 assert.equal(released,1);assert.equal(last,false);assert.ok(throwPose(0).pos.y<-.6&&throwPose(ROPE.throwSeconds).pos.y<-.6);assert.ok(throwPose(THROW.releaseAt-.01).coil&&!throwPose(THROW.releaseAt+.01).coil);
});
