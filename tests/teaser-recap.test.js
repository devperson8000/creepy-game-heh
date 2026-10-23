import test from 'node:test';import assert from 'node:assert/strict';
import {RECAP_DURATION,recapFrame} from '../src/teaser-recap.js';
import {finaleChoreographyTime,finaleShot} from '../src/finale-state.js';
test('historical recap has a title, shows the severed head and never includes the walkout',()=>{
 assert.equal(recapFrame(0).phase,'previously');assert.equal(recapFrame(0).subtitle,'PREVIOUSLY…');
 const shots=new Set();for(let t=1.6;t<RECAP_DURATION-.6;t+=.025){const f=recapFrame(t);shots.add(finaleShot(f.finaleTime).name);assert.ok(finaleChoreographyTime(f.finaleTime)<44);}
 for(const shot of ['chase','stairs','dive','trapped','ascent','sever','death'])assert.ok(shots.has(shot),shot);
 assert.equal(recapFrame(RECAP_DURATION).phase,'teaser');assert.equal(recapFrame(RECAP_DURATION+5).teaserTime,5);
 assert.deepEqual(recapFrame(10),recapFrame(10));assert.ok(recapFrame(RECAP_DURATION-.01).fade>.9);
});

import * as THREE from 'three';
import {prependFinaleRecap} from '../src/teaser-recap.js';
import {createFinaleScene} from '../src/finale-scene.js';
test('history is ready independently of delayed teaser assets; picture and audio stay paired',async()=>{
 const old=globalThis.document,context=new Proxy({measureText:s=>({width:s.length*10}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})});
 globalThis.document={hidden:false,createElement:()=>({getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(v){}})};
 let releaseFilm,releaseAvatar,samples=0,disposedAudio=0;const filmReady=new Promise(r=>releaseFilm=r),avatarReady=new Promise(r=>releaseAvatar=r),asset={scene:new THREE.Group(),animations:[]};
 const film={scene:{ready:filmReady,target:new THREE.WebGLRenderTarget(960,540),dispose(){},render(){}},audio:{pause(){},resume(){},dispose(){},update(){}},sample:t=>({time:t})};
 const p=prependFinaleRecap(film,{loadAsset:()=>avatarReady,createHistoryAudio:()=>({resume(){},dispose(){disposedAudio++;},setMuted(){},setVolume(){},sample(){samples++;}})});
 const renderer={autoClear:true,toneMappingExposure:1,getRenderTarget:()=>null,getViewport:v=>v,getScissor:v=>v,getScissorTest:()=>false,setRenderTarget(){},setViewport(){},setScissor(){},setScissorTest(){},render(scene){this.drawn=scene;}};
 try{
  p.audio.update(10);assert.equal(samples,0,'no historical audio without its picture');
  releaseAvatar(asset);await new Promise(r=>setImmediate(r));assert.ok(p.scene.historical,'history must not await teaser GLBs');
  p.scene.render(renderer,10,{reducedMotion:true});assert.equal(renderer.drawn,p.scene.historical.scene);p.audio.update(10);assert.equal(samples,1);
  const expected=createFinaleScene({asset,cast:[{id:'memory-0',slot:0},{id:'memory-1',slot:1}],runnerId:'memory-0',buttonId:'memory-1',quality:'low',reducedMotion:true});expected.resize(16/9);
  for(const t of [3,5]){p.scene.render(renderer,t,{reducedMotion:true});expected.sample(recapFrame(t).finaleTime);assert.ok(expected.camera.position.distanceTo(p.scene.historical.camera.position)<1e-8,'reduced motion reaches historical camera');}
  expected.dispose();releaseFilm();await p.scene.ready;p.audio.update(16);assert.equal(disposedAudio,1);
 }finally{releaseFilm();releaseAvatar(asset);p.audio.dispose();p.scene.dispose();film.scene.target.dispose();globalThis.document=old;}
});
