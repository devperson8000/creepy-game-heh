import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeamlessLoopBuffer } from '../src/seamless-audio-loop.js';

function fakeAudioBuffer(channels,length,sampleRate){
 const data=Array.from({length:channels},(_,channel)=>{
  const samples=new Float32Array(length);
  for(let i=0;i<length;i++)samples[i]=Math.sin((Math.PI*2*i/240)+channel*.4);
  return samples;
 });
 return {
  numberOfChannels:channels,length,sampleRate,
  getChannelData(channel){return data[channel];}
 };
}

test('seamless loop buffer folds the end into the beginning without a hard jump',()=>{
 const input=fakeAudioBuffer(2,1200,1000);
 const context={createBuffer(channels,length,sampleRate){return fakeAudioBuffer(channels,length,sampleRate);}};
 const output=createSeamlessLoopBuffer(context,input,.2);
 assert.notEqual(output,input);
 assert.equal(output.numberOfChannels,2);
 assert.equal(output.sampleRate,input.sampleRate);
 assert.ok(output.length<input.length);
 for(let channel=0;channel<2;channel++){
  const samples=output.getChannelData(channel);
  assert.ok(Math.abs(samples[0]-samples[samples.length-1])<.08,'loop endpoints should meet smoothly');
  assert.ok(Math.abs(samples[1]-samples[0])<.08,'the first edge should not click');
 }
});

test('very short audio buffers are returned unchanged rather than producing a broken loop',()=>{
 const input=fakeAudioBuffer(1,64,1000);
 const context={createBuffer(){throw new Error('short source should not allocate');}};
 assert.equal(createSeamlessLoopBuffer(context,input,.38),input);
});
