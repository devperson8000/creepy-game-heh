import test from 'node:test';
import assert from 'node:assert/strict';
import {downedPose,bodyPoints,bleedRemaining,rescuerLean,downedKind,DOWNED_RADIUS} from '../src/monochrome2-downed-pose.js';
import {TEAM} from '../src/monochrome2-tuning.js';

test('downed poses rest on the floor at every moment: never sunk into it, never hovering',()=>{
 for(const by of ['Monochrome','Bacteria',null,'something else'])for(let k=0;k<=1.0001;k+=.01){
  const p=downedPose(by,k),ys=bodyPoints(p,p.dy).map(q=>q.y),low=Math.min(...ys);
  assert.ok(low>=-1e-9,`${by} k=${k.toFixed(2)} sinks by ${low}`);assert.ok(low<1e-9,`${by} k=${k.toFixed(2)} hovers at ${low}`);
 }
});
test('downed poses end low and flat: Monochrome flat on the back, the Bacteria curled on the side',()=>{
 const flat=bodyPoints(downedPose('Monochrome',1),downedPose('Monochrome',1).dy),curled=bodyPoints(downedPose('Bacteria',1),downedPose('Bacteria',1).dy);
 assert.ok(Math.max(...flat.map(p=>p.y))<2*DOWNED_RADIUS+.2,'Monochrome victim lies flat');
 assert.ok(Math.max(...curled.map(p=>p.y))<2*DOWNED_RADIUS+.25,'Bacteria victim lies low');
 const reach=pts=>Math.max(...pts.map(p=>Math.hypot(p.x,p.z)));assert.ok(reach(curled)<reach(flat)-.2,'curled is more compact than flat');
 assert.ok(downedPose('Monochrome',1).rx>0&&downedPose('Bacteria',1).rz<0,'different poses');
});
test('the fall is smooth: no frame moves any body point more than a few centimetres',()=>{
 for(const by of ['Monochrome','Bacteria']){let prev=null;for(let k=0;k<=1.0001;k+=1/90){const p=downedPose(by,k),pts=bodyPoints(p,p.dy);if(prev)for(let i=0;i<pts.length;i++)assert.ok(Math.hypot(pts[i].x-prev[i].x,pts[i].y-prev[i].y,pts[i].z-prev[i].z)<.12,by+' jump at '+k.toFixed(2));prev=pts;}}
});
test('bleed ring runs from full to empty over the bleed-out window; unknown killers use the default pose',()=>{
 assert.equal(bleedRemaining({downedFor:0}),1);assert.equal(bleedRemaining({downedFor:TEAM.bleedOutSeconds}),0);assert.ok(Math.abs(bleedRemaining({downedFor:TEAM.bleedOutSeconds/2})-.5)<1e-9);assert.equal(bleedRemaining({downedFor:999}),0);
 assert.equal(downedKind('Monochrome'),'Monochrome');assert.equal(downedKind('x'),'default');
});
test('a crouched friend close to a downed player leans toward them; nobody else does',()=>{
 const victim={x:0,z:0,downed:true};
 assert.equal(rescuerLean({x:3,z:0,crouch:true},victim),null);assert.equal(rescuerLean({x:.5,z:0,crouch:false},victim),null);assert.equal(rescuerLean({x:.5,z:0,crouch:true},{...victim,downed:false}),null);
 const l=rescuerLean({x:.5,z:0,crouch:true},victim);assert.ok(l&&l.lean>.2&&l.lean<=.45);
});
