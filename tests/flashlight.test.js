import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const glb=await readFile(resolve(root,'public/models/monochrome2/flashlight.glb'));
const jsonLength=glb.readUInt32LE(12);
const json=JSON.parse(glb.subarray(20,20+jsonLength).toString('utf8').trim());

test('Monochrome 2 flashlight housing is matte black while the lens stays translucent',()=>{
 const body=json.materials.find(material=>material.name==='Matte Black Anodised Aluminium');
 assert.ok(body,'black housing material exists');
 const colour=body.pbrMetallicRoughness.baseColorFactor;
 assert.ok(colour[0]<.025&&colour[1]<.03&&colour[2]<.04,'housing is near-black');
 assert.equal(body.pbrMetallicRoughness.metallicFactor,.72);
 assert.ok(body.pbrMetallicRoughness.roughnessFactor>.2);
 const glass=json.materials.filter(material=>material.name.toLowerCase().includes('glass'));
 assert.ok(glass.length>=2,'glass lens materials remain separate');
 assert.ok(glass.every(material=>material.pbrMetallicRoughness.baseColorFactor[3]<.2),'glass remains translucent');
});

test('Monochrome 2 loads the flashlight view model and lens-origin beam',async()=>{
 const source=await readFile(resolve(root,'src/backrooms.js'),'utf8');
 assert.match(source,/createHeldFlashlight\(camera/);
 assert.match(source,/emitterWorldPosition/);
 assert.match(source,/beam\.castShadow=true/);
 assert.match(source,/playFlashlightSwitch\(context,master,torchOn\)/);
});

test('flashlight is bundled at the public runtime URL',async()=>{
 const source=await readFile(resolve(root,'src/flashlight.js'),'utf8');
 assert.match(source,/\/models\/monochrome2\/flashlight\.glb/);
 const pit=await readFile(resolve(root,'src/backrooms-pitfall-view.js'),'utf8');
 assert.match(pit,/models\/monochrome2\/flashlight\.glb/);
});

test('test path bypasses the gate only for testing; public gameplay stays gated',async()=>{
 const entry=await readFile(resolve(root,'src/entry.js'),'utf8');
 assert.match(entry,/isMonochrome2TestPath[\s\S]*startMonochrome2Play\(\{alreadyReleased:true,testMode:true\}\)/);
 assert.match(entry,/isMonochrome2PlayPath[\s\S]*startMonochrome2Play\(\)/);
 const release=await readFile(resolve(root,'src/monochrome2-release-time.js'),'utf8');
 assert.match(release,/2026-12-02T09:00:00\+11:00/);
});
