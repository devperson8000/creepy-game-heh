import test from 'node:test';import assert from 'node:assert/strict';import * as ambience from '../src/room-ambience.js';
test('the room hushes shortly before six and threat cues begin only during hunting',()=>{
 const safe=ambience.ambienceMix?.({huntElapsed:50,threat:1}),edge=ambience.ambienceMix?.({huntElapsed:89.5,threat:1}),hunt=ambience.ambienceMix?.({huntElapsed:95,threat:.9});
 assert.ok(safe&&edge&&hunt);assert.equal(safe.heartbeat,0);assert.ok(edge.room<safe.room*.4);assert.ok(hunt.heartbeat>0);assert.ok(hunt.room>edge.room);
});
test('hiding quiets exertion while keeping every mix channel bounded',()=>{
 const open=ambience.ambienceMix?.({huntElapsed:95,threat:.8,sprinting:true}),hidden=ambience.ambienceMix?.({huntElapsed:95,threat:.8,sprinting:true,hidden:true});
 assert.ok(open&&hidden);assert.ok(hidden.breath<open.breath);for(const value of Object.values(hidden))assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
});
