import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/creature.js';
test('running articulates knees and opposing arms without moving through the room',()=>{
 assert.equal(typeof model.applyRunning,'function');
 const c=model.createCreature();
 model.applyRunning(c,0.3,1);
 const first=c.legs.map(leg=>leg.rotation.x);
 model.applyRunning(c,0.65,1);
 assert.notDeepEqual(c.legs.map(leg=>leg.rotation.x),first);
 assert.ok(c.knees.some(k=>Math.abs(k.rotation.x)>.2));
 assert.ok(c.arms[0].rotation.x*c.arms[1].rotation.x<0);
 assert.equal(c.root.position.x,0);assert.equal(c.root.position.z,0);
 model.applyIdle(c,{sway:0,yaw:0,pitch:0,arm:0});
 assert.equal(c.root.position.y,0);assert.equal(c.knees[0].rotation.x,0);
});
