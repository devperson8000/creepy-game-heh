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
  createBufferSource(){return {connect(){},disconnect(){},start(when=0,offset=0){starts.push({when,offset,duration:this.buffer.duration});},stop(){}};}
  resume(){return this.state==='running'?Promise.resolve():new Promise(resolve=>pending.push(resolve));}
  close(){return Promise.resolve();}
 }
 globalThis.AudioContext=Context;t.after(()=>{delete globalThis.AudioContext;delete globalThis.document;});
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
 t.mock.method(globalThis,'fetch',async url=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(url.includes('help')?2:url.includes('radio-out')?1:3)}));
 const audio=createTeaserAudio();audio.resume();await flush();await flush();
 for(let i=0;i<=50;i++)audio.update(i/10);
 assert.equal(starts.length,0);
 context.state='running';pending.splice(0).forEach(resolve=>resolve());await flush();
 assert.equal(starts.length,3,'the radio line has already finished and must not start late');
 assert.ok(Math.abs(starts[0].when-1.2)<.05,'first help arrives 1.2 seconds after unlocking at film time5');
 assert.ok(Math.abs(starts[1].when-6.7)<.05);audio.dispose();
});
