import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {CAMCORDER_PROFILE,camcorderFrame,camcorderMotion,tapeTimestamp} from '../src/camcorder.js';
test('tape aperture contains a true4:3 picture at every device shape',()=>{
 for(const [w,h]of [[1440,900],[390,844],[844,390],[320,180],[2560,1080]]){const f=camcorderFrame(w,h);assert.ok(Math.abs(f.width/f.height-4/3)<1e-10);assert.ok(f.x>=0&&f.y>=0&&f.x+f.width<=w+.001&&f.y+f.height<=h+.001);}
});
test('optics use a36mm gate and24mm lens with15percent desaturation',()=>{
 const camera=new T.PerspectiveCamera(50,4/3);camera.filmGauge=CAMCORDER_PROFILE.filmGauge;camera.setFocalLength(CAMCORDER_PROFILE.focalLength);
 assert.ok(Math.abs(camera.getFocalLength()-24)<1e-8);assert.ok(Math.abs(camera.fov-58.7155)<.001);assert.equal(CAMCORDER_PROFILE.desaturation,.15);
});
test('handheld motion stays subtle and deterministic, and disappears for reduced motion',()=>{
 const a=camcorderMotion(8.1);assert.deepEqual(a,camcorderMotion(8.1));assert.notDeepEqual(a,camcorderMotion(8.4));
 for(let t=0;t<50;t+=.07){const m=camcorderMotion(t);assert.ok(m.position.every(v=>Math.abs(v)<.01));assert.ok(m.rotation.every(v=>Math.abs(v)<.003));}
 assert.deepEqual(camcorderMotion(8.1,true),{position:[0,0,0],rotation:[0,0,0]});
});
test('retro timestamp advances with film time, including minute rollover',()=>{
 assert.deepEqual(tapeTimestamp(0),['OCT 31 2026','03:59:00 PM']);assert.equal(tapeTimestamp(61)[1],'04:00:01 PM');assert.deepEqual(tapeTimestamp(NaN),tapeTimestamp(0));
});
