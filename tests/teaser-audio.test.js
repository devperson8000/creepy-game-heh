import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeaserAudio} from '../src/teaser-audio.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('unlocking a suspended audio context joins the current film instead of replaying the opening',async t=>{
 const starts=[],pending=[];let context;
 const parameter=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Context{
  constructor(){context=this;this.state='suspended';this.currentTime=0;this.sampleRate=1000;this.destination={};}
  createGain(){return {gain:parameter(),connect(){},disconnect(){}};}
  createBuffer(channels,length,rate){return {duration:length/rate,getChannelData:()=>new Float32Array(length)};}
  decodeAudioData(bytes){return Promise.resolve({duration:bytes.byteLength===1?1.22:bytes.byteLength===2?1.817:120});}
  createBiquadFilter(){return {frequency:parameter(),Q:parameter(),gain:parameter(),connect(){},disconnect(){}};}
  createDynamicsCompressor(){return {threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter(),connect(){},disconnect(){}};}
  createConvolver(){return {connect(){},disconnect(){}};}
  createOscillator(){return {frequency:parameter(),connect(){},disconnect(){},start(){},stop(){}};}
  createBufferSource(){return {connect(){},disconnect(){},start(when=0,offset=0){starts.push({when,offset,duration:this.buffer.duration});},stop(){}};}
  resume(){return this.state==='running'?Promise.resolve():new Promise(resolve=>pending.push(resolve));}
  close(){return Promise.resolve();}
 }
 globalThis.AudioContext=Context;t.after(()=>{delete globalThis.AudioContext;delete globalThis.document;});
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
 t.mock.method(globalThis,'fetch',async url=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(url.includes('help')?2:url.includes('radio-out')?1:3)}));
 const audio=createTeaserAudio();audio.resume();await flush();await flush();
 for(let i=0;i<=80;i++)audio.update(i/10);
 assert.equal(starts.length,0);
 context.state='running';pending.splice(0).forEach(resolve=>resolve());await flush();
 const voices=starts.filter(s=>s.duration>1);assert.equal(voices.length,1,'the radio line has finished and must not replay late');
 assert.ok(Math.abs(voices[0].when-4.5)<.05,'the metallic Monochrome cue joins at the current edit time');audio.dispose();
});
