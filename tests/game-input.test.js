import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {gameInput} from '../src/game-input.js';
class Node extends EventTarget{constructor(){super();this.dataset={};this.attrs={};}closest(){return false;}setPointerCapture(){}setAttribute(k,v){this.attrs[k]=v;}focus(){}}
function event(type,props){const e=new Event(type,{cancelable:true});for(const [k,v] of Object.entries(props))Object.defineProperty(e,k,{value:v});return e;}
function fixture(t){const originals={document:globalThis.document,window:globalThis.window,matchMedia:globalThis.matchMedia};globalThis.document=new Node();globalThis.window=new Node();globalThis.matchMedia=()=>({matches:false});t.after(()=>Object.assign(globalThis,originals));const canvas=new Node(),run=new Node(),interact=new Node();run.dataset.walk='ShiftLeft';let pauses=0,captures=0;const ui={overlay:null,root:{querySelectorAll:()=>[run]},el:()=>interact};const input=gameInput(new THREE.PerspectiveCamera(),canvas,ui,()=>pauses++,()=>captures++);return {input,ui,run,canvas,document:globalThis.document,get pauses(){return pauses;},get captures(){return captures;}};}
test('holding Escape pauses once rather than repeatedly toggling overlays',t=>{const f=fixture(t);f.document.dispatchEvent(event('keydown',{code:'Escape',repeat:false,target:f.canvas}));f.document.dispatchEvent(event('keydown',{code:'Escape',repeat:true,target:f.canvas}));assert.equal(f.pauses,1);});
test('touch sprint is held, releases safely, and ignores touches through an overlay',t=>{const f=fixture(t);f.run.dispatchEvent(event('pointerdown',{pointerId:1}));assert.equal(f.input.sprint,true);assert.equal(f.run.attrs['aria-pressed'],'true');f.run.dispatchEvent(event('lostpointercapture',{}));assert.equal(f.input.sprint,false);assert.equal(f.run.attrs['aria-pressed'],'false');f.ui.overlay='pause';f.run.dispatchEvent(event('pointerdown',{pointerId:1}));assert.equal(f.input.sprint,false);});
test('clicking into play unlocks audio and focus through the capture callback',t=>{const f=fixture(t);f.canvas.dispatchEvent(event('click',{}));assert.equal(f.captures,1);f.ui.overlay='arrival';f.canvas.dispatchEvent(event('click',{}));assert.equal(f.captures,1);});
test('movement keys still work while a gameplay button retains focus',t=>{
 const f=fixture(t),focusedButton=new Node();focusedButton.closest=()=>true;
 for(const [code,forward,right] of [['KeyW',1,0],['ArrowUp',1,0],['KeyS',-1,0],['ArrowDown',-1,0],['KeyA',0,-1],['ArrowLeft',0,-1],['KeyD',0,1],['ArrowRight',0,1]]){
  f.document.dispatchEvent(event('keydown',{code,repeat:false,target:focusedButton}));
  assert.deepEqual(f.input.movement,{forward,right},code);
  f.document.dispatchEvent(event('keyup',{code,target:focusedButton}));
  assert.deepEqual(f.input.movement,{forward:0,right:0},`${code} release`);
 }
});
test('both sprint keys work with focused buttons and releasing one preserves the other',t=>{
 const f=fixture(t),focusedButton=new Node();focusedButton.closest=()=>true;
 f.document.dispatchEvent(event('keydown',{code:'ShiftLeft',repeat:false,target:focusedButton}));assert.equal(f.input.sprint,true);
 f.document.dispatchEvent(event('keydown',{code:'ShiftRight',repeat:false,target:focusedButton}));assert.equal(f.input.sprint,true);
 f.document.dispatchEvent(event('keyup',{code:'ShiftLeft',target:focusedButton}));assert.equal(f.input.sprint,true);
 f.document.dispatchEvent(event('keyup',{code:'ShiftRight',target:focusedButton}));assert.equal(f.input.sprint,false);
});
test('movement remains blocked by overlays and text entry',t=>{
 const f=fixture(t),focusedButton=new Node(),input=new Node();focusedButton.closest=()=>true;input.tagName='INPUT';
 f.ui.overlay='pause';f.document.dispatchEvent(event('keydown',{code:'KeyW',repeat:false,target:focusedButton}));assert.equal(f.input.movement.forward,0);
 f.ui.overlay=null;f.document.dispatchEvent(event('keydown',{code:'KeyW',repeat:false,target:input}));assert.equal(f.input.movement.forward,0);
});
test('losing a look-drag capture cannot turn the camera after release or pause',t=>{
 const f=fixture(t);f.canvas.dispatchEvent(event('pointerdown',{clientX:10,clientY:10,pointerId:1}));f.canvas.dispatchEvent(event('lostpointercapture',{}));const yaw=f.input.yaw;
 f.canvas.dispatchEvent(event('pointermove',{clientX:80,clientY:40,pointerId:1}));assert.equal(f.input.yaw,yaw);
 f.canvas.dispatchEvent(event('pointerdown',{clientX:10,clientY:10,pointerId:1}));f.input.clear();f.canvas.dispatchEvent(event('pointermove',{clientX:90,clientY:10,pointerId:1}));assert.equal(f.input.yaw,yaw);
});
