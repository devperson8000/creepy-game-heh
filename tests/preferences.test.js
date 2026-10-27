import test from 'node:test';import assert from 'node:assert/strict';
import {sanitizePreferences,createRenderQuality} from '../src/preferences.js';
test('saved settings remain usable when storage contains invalid or extreme values',()=>{
 const p=sanitizePreferences({sensitivity:999,brightness:-1,volume:NaN,quality:'ultra',reducedMotion:'false'});
 assert.equal(p.sensitivity,2);assert.equal(p.brightness,.7);assert.equal(p.volume,.8);assert.equal(p.quality,'auto');assert.equal(p.reducedMotion,false);
});
test('microphone sensitivity survives saves and rejects invalid or extreme gain',()=>{
 assert.equal(sanitizePreferences({micSensitivity:1.4}).micSensitivity,1.4);
 assert.equal(sanitizePreferences({micSensitivity:Infinity}).micSensitivity,1);
 assert.equal(sanitizePreferences({micSensitivity:20}).micSensitivity,2);
 assert.equal(sanitizePreferences({micSensitivity:-1}).micSensitivity,.5);
});
test('automatic render resolution steps down under sustained slow frames without changing gameplay',()=>{
 const ratios=[],renderer={setPixelRatio:v=>ratios.push(v),setSize(){},domElement:{clientWidth:800,clientHeight:600}};
 const quality=createRenderQuality(renderer,{pixelRatio:1.5});
 for(let i=0;i<240;i++)quality.update(.04,'auto');
 assert.ok(ratios.at(-1)<ratios[0]);assert.ok(ratios.at(-1)>=.65);
 quality.update(.016,'high');assert.equal(ratios.at(-1),1.5);
});
