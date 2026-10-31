import test from 'node:test';import assert from 'node:assert/strict';
import {createOpeningAudio} from '../src/opening-audio.js';
import {openingFrame} from '../src/opening-sequence.js';

test('opening audio unlock joins the current line, never replays old speech, and stops every source on disposal',async t=>{
 const starts=[],nodes=[];let context;
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=(extra={})=>({connect(){},disconnect(){},...extra});
 class Context{
  constructor(){context=this;this.state='suspended';this.currentTime=0;this.sampleRate=1000;this.destination={};this.closed=false;}
  createGain(){return node({gain:param()});}createConvolver(){return node();}
  createBuffer(c,n,r){return {duration:n/r,getChannelData:()=>new Float32Array(n)};}
  decodeAudioData(){return Promise.resolve({duration:1.75,dialogue:true});}
  createBiquadFilter(){return node({frequency:param()});}
  createOscillator(){const s=node({frequency:param(),start(){},stop(){this.stopped=true;}});nodes.push(s);return s;}
  createBufferSource(){const s=node({start(when=0,offset=0){starts.push({source:this,offset,dialogue:this.buffer.dialogue});},stop(){this.stopped=true;}});nodes.push(s);return s;}
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
  close(){this.closed=true;return Promise.resolve();}
 }
 globalThis.AudioContext=Context;t.after(()=>delete globalThis.AudioContext);
 t.mock.method(globalThis,'fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}));
 const audio=createOpeningAudio();await audio.ready;audio.update(openingFrame(13.1));assert.equal(starts.length,0);
 audio.resume();await Promise.resolve();let voices=starts.filter(s=>s.dialogue);assert.equal(voices.length,1);assert.ok(Math.abs(voices[0].offset-.7)<.01);
 voices[0].source.ended=true;voices[0].source.onended();audio.update(openingFrame(13.2));assert.equal(starts.filter(s=>s.dialogue).length,1,'a finished source cannot stutter/repeat');
 audio.update(openingFrame(17.5));assert.equal(starts.filter(s=>s.dialogue).length,2);
 audio.toggle();assert.equal(audio.enabled,false);audio.update(openingFrame(23.8));assert.equal(starts.filter(s=>s.dialogue).length,2);
 audio.toggle();await Promise.resolve();voices=starts.filter(s=>s.dialogue);assert.equal(voices.length,3);assert.ok(Math.abs(voices[2].offset-.4)<.01,'unmute joins the current wall reaction');
 audio.pause();assert.equal(context.state,'suspended');audio.dispose();audio.dispose();assert.equal(context.closed,true);assert.ok(nodes.every(s=>s.stopped||s.ended));
 const count=starts.length;audio.resume();audio.update(openingFrame(33.2));assert.equal(starts.length,count,'disposed soundtrack stays silent');
 let failedRequests=0;t.mock.method(globalThis,'fetch',async()=>{failedRequests++;throw new Error('Offline');});
 const offline=createOpeningAudio();await offline.ready;assert.equal(failedRequests,4);offline.dispose();
});
