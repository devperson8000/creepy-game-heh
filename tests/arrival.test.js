import test from 'node:test';
import assert from 'node:assert/strict';
import {arrivalFrame,ARRIVAL_DURATION,ARRIVAL_TITLE_AT} from '../src/arrival.js';
test('three seconds are fully black before distant eyes appear instantly',()=>{
 for(const t of [0,1,2.99]){const p=arrivalFrame(t);assert.equal(p.black,1);assert.equal(p.eyes,0);assert.equal(p.title,0);}
 assert.ok(arrivalFrame(3).eyes>0);assert.equal(arrivalFrame(3).black,1);
});
test('title follows eyes and fades before the actual world wake-up',()=>{
 assert.equal(arrivalFrame(3.5).title,0);assert.ok(arrivalFrame(4.8).title>.9);
 assert.equal(arrivalFrame(6.7).title,0);assert.ok(arrivalFrame(7.2).black<1);
});
test('first-person lids blink twice then open fully as the camera stands up',()=>{
 assert.ok(arrivalFrame(7.25).openness>arrivalFrame(7.58).openness);
 assert.ok(arrivalFrame(7.95).openness>arrivalFrame(8.18).openness);
 assert.ok(arrivalFrame(6.9).eyeHeight<.35);assert.equal(arrivalFrame(9).eyeHeight,.22);assert.ok(arrivalFrame(10.5).eyeHeight>1.5);
 const end=arrivalFrame(ARRIVAL_DURATION);assert.equal(end.done,true);assert.equal(end.openness,1);assert.equal(end.eyeHeight,1.65);assert.equal(end.roll,0);
});

test('the title cuts from absent to fully visible at the exact hit cue with no fade-in',()=>{
 assert.equal(arrivalFrame(ARRIVAL_TITLE_AT-.000001).title,0);
 assert.equal(arrivalFrame(ARRIVAL_TITLE_AT).title,1);
 assert.equal(arrivalFrame(ARRIVAL_TITLE_AT+.001).title,1);
});

test('Halloween wake-up acknowledges the changed suit only while the player discovers it',()=>{
 assert.equal(arrivalFrame(9.3).dialogue,'');assert.equal(arrivalFrame(7,{halloween:true}).dialogue,'');assert.equal(arrivalFrame(9.3,{halloween:true}).dialogue,'I wasn’t wearing this suit.');assert.equal(arrivalFrame(ARRIVAL_DURATION,{halloween:true}).dialogue,'');
});
