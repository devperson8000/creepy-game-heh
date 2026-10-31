import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
const module=await import('../src/halloween-surfaces.js').catch(()=>({}));
test('Halloween surface detail is locally generated, shared per kind and uses linear data maps',()=>{
 assert.equal(typeof module.createHalloweenSurfaces,'function');const bank=module.createHalloweenSurfaces();
 for(const kind of ['pumpkin','wax','iron','cloth','wood','stone','paper']){const a=bank.get(kind),b=bank.get(kind);assert.equal(a,b);for(const texture of [a.bumpMap,a.roughnessMap]){assert.ok(texture.isDataTexture);assert.equal(texture.colorSpace,THREE.NoColorSpace);assert.equal(texture.wrapS,THREE.RepeatWrapping);assert.equal(texture.image.width,128);const values=new Set(texture.image.data);assert.ok(values.size>12&&values.size<256);}assert.ok(a.bumpScale>0&&a.bumpScale<.015);}
 bank.dispose();
});
test('weathering changes surface detail deterministically and bank disposal owns maps once',()=>{
 assert.equal(typeof module.createHalloweenSurfaces,'function');const a=module.createHalloweenSurfaces(),b=module.createHalloweenSurfaces(),old=module.createHalloweenSurfaces({aged:true});
 const first=a.get('iron');assert.deepEqual(first.bumpMap.image.data,b.get('iron').bumpMap.image.data);assert.notDeepEqual(first.bumpMap.image.data,old.get('iron').bumpMap.image.data);
 let count=0,other=0;first.bumpMap.addEventListener('dispose',()=>count++);first.roughnessMap.addEventListener('dispose',()=>count++);b.get('iron').bumpMap.addEventListener('dispose',()=>other++);a.dispose();a.dispose();assert.equal(count,2);assert.equal(other,0);b.dispose();old.dispose();
});
