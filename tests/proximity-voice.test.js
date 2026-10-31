import test from 'node:test';
import assert from 'node:assert/strict';
import * as voice from '../src/proximity-voice.js';
const origin={x:0,y:1.65,z:0,yaw:0,pitch:0};
test('nearby speech is clear, middle distance is quiet, and distant speech is silent',()=>{
 const gain=d=>voice.proximityVoiceMix(origin,{x:d,y:1.65,z:0}).gain;
 assert.equal(gain(0),1);assert.equal(gain(2),1);assert.ok(gain(6)<.2&&gain(6)>.08);assert.ok(gain(8)<.08&&gain(8)>.02);
 assert.equal(gain(16),0);assert.equal(gain(200),0);
 let previous=1;for(let distance=0;distance<=20;distance+=.1){const current=gain(distance);assert.ok(current<=previous+1e-10&&current>=0);previous=current;}
});
test('turning rotates a friend from right to front to left without changing distance gain',()=>{
 const friend={x:4,y:1.65,z:0};
 const right=voice.proximityVoiceMix(origin,friend),front=voice.proximityVoiceMix({...origin,yaw:-Math.PI/2},friend),left=voice.proximityVoiceMix({...origin,yaw:Math.PI},friend);
 assert.ok(right.x>3.9&&left.x< -3.9);assert.ok(Math.abs(front.x)<1e-6&&front.z< -3.9);assert.equal(right.gain,left.gain);assert.equal(right.gain,front.gain);
});
test('height and camera pitch contribute to the true three-dimensional voice direction',()=>{
 const mix=voice.proximityVoiceMix({...origin,pitch:Math.PI/2},{x:0,y:5.65,z:0});assert.ok(Math.abs(mix.y)<1e-6);assert.ok(mix.z< -3.9);
 const floor=voice.proximityVoiceMix(origin,{x:0,y:21.65,z:0});assert.equal(floor.gain,0);
});
test('missing, invalid or disconnected player positions cannot leak full-volume voice',()=>{
 for(const friend of [undefined,{x:NaN,y:0,z:0},{x:0,y:Infinity,z:0}])assert.equal(voice.proximityVoiceMix(origin,friend).gain,0);
 assert.equal(voice.proximityVoiceMix(null,{x:0,y:0,z:0}).gain,0);assert.equal(voice.proximityVoiceMix(origin,origin,false).gain,0);
});
