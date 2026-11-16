import test from 'node:test';
import assert from 'node:assert/strict';
import {arrivalFrame,ARRIVAL_DURATION} from '../src/arrival.js';

test('the waking animation begins with the eyelids already opening, not on a black title screen',()=>{
 const first=arrivalFrame(8.48);
 assert.equal(first.done,false);
 assert.equal(first.openness,.66);
 assert.equal(first.eyeHeight,.22);
 assert.equal(first.dialogue,'');
});

test('the camera rises smoothly while the eyelids finish opening',()=>{
 const middle=arrivalFrame(9.9);
 const final=arrivalFrame(ARRIVAL_DURATION);
 assert.ok(middle.eyeHeight>.22);
 assert.ok(middle.eyeHeight<1.65);
 assert.equal(final.openness,1);
 assert.equal(final.eyeHeight,1.65);
 assert.equal(final.roll,0);
});

test('the animation reports completion at its deadline so the game can release the overlay',()=>{
 assert.equal(arrivalFrame(ARRIVAL_DURATION-.01).done,false);
 assert.equal(arrivalFrame(ARRIVAL_DURATION).done,true);
});

test('the optional suit caption remains limited to its original discovery moment',()=>{
 assert.equal(arrivalFrame(9.3).dialogue,'');
 assert.equal(arrivalFrame(9.3,{halloween:true}).dialogue,'I wasn’t wearing this suit.');
 assert.equal(arrivalFrame(ARRIVAL_DURATION,{halloween:true}).dialogue,'');
});
