import test from 'node:test';
import assert from 'node:assert/strict';
import {footstepNoise,interactionNoise} from '../src/player-noise.js';
test('standing or pushing against a wall is silent, but actual walking emits footsteps',()=>{
 const tracker={distance:0},position={x:2,z:3,height:0};
 for(let i=0;i<100;i++)assert.equal(footstepNoise(tracker,0,false,position),null);
 assert.equal(footstepNoise(tracker,.6,false,position),null);
 const sound=footstepNoise(tracker,.6,false,position);assert.equal(sound.type,'walk');assert.equal(sound.radius,7);assert.equal(sound.x,2);
});
test('sprinting carries farther than walking; opening drawers is noisier than lifting keys',()=>{
 const position={x:2,z:3,height:0};
 const walk=footstepNoise({distance:0},1.5,false,position),sprint=footstepNoise({distance:0},1.5,true,position);
 assert.ok(sprint.radius>walk.radius);
 assert.ok(interactionNoise('drawer',position).radius>interactionNoise('drawer',position,{takingKey:true}).radius);
});
