import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreature,applyIdle} from '../src/creature.js';
import {idlePose} from '../src/idle.js';
test('arm surface normals face outward so exterior surfaces render',()=>{
 const creature=createCreature();
 const g=creature.arms[0].children[0].geometry;
 const positions=g.attributes.position, normals=g.attributes.normal;
 let outward=0;
 for(let i=0;i<positions.count;i++) outward+=positions.getX(i)*normals.getX(i)+positions.getZ(i)*normals.getZ(i);
 assert.ok(outward>0,'arm normals must point away from the limb');
});
test('animation leaves feet and world position fixed',()=>{
 const c=createCreature();
 const legs=c.root.children.filter(part=>part!==c.torso);
 const starting=legs.map(p=>p.position.clone());
 for(let t=0;t<100;t+=.7) applyIdle(c,idlePose(t));
 assert.equal(c.root.position.length(),0);
 assert.equal(c.root.rotation.x,0);assert.equal(c.root.rotation.z,0);
 legs.forEach((part,i)=>assert.ok(part.position.equals(starting[i])));
});

test('creature locomotion eases in and out without accumulating movement across teleports',async()=>{
 const {createCreatureMotion}=await import('../src/creature.js');assert.equal(typeof createCreatureMotion,'function');const motion=createCreatureMotion();
 motion.update({x:0,z:0},'chase',.05,true);const start=motion.update({x:0,z:.2},'chase',.05,true);assert.ok(start.weight>0&&start.weight<1);
 for(let i=2;i<12;i++)motion.update({x:0,z:i*.2},'chase',.05,true);
 const stopping=motion.update({x:0,z:2.2},'chase',.05,true);assert.ok(stopping.weight>0&&stopping.weight<1);
 const paused=motion.update({x:0,z:2.2},'chase',0,true);assert.equal(paused.time,stopping.time);
 const jump=motion.update({x:50,z:2.2},'chase',.05,true);assert.ok(jump.time-stopping.time<.1);
});
