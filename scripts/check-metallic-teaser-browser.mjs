import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.GAME_TEST_URL||'http://localhost:5173';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.locator('#lobby-singleplayer').waitFor();
 const result=await page.evaluate(async()=>{
  const {createMetallicTeaserVoice}=await import('/src/teaser-metallic-voice.js');
  const rate=44100,length=rate/2;
  const context=new OfflineAudioContext(1,length,rate),source=context.createBufferSource(),input=context.createBuffer(1,length,rate);
  input.getChannelData(0)[0]=.5;source.buffer=input;
  const effect=createMetallicTeaserVoice(context,context.destination);source.connect(effect.input);source.start(0);
  const rendered=await context.startRendering(),data=rendered.getChannelData(0);let tail=0,late=0;
  for(let i=rate*.004|0;i<rate*.15;i++)tail+=data[i]*data[i];for(let i=rate*.3|0;i<data.length;i++)late+=data[i]*data[i];
  const stats={attack:data[0],tail,late,sourceUnchanged:input.getChannelData(0)[0]===.5&&input.getChannelData(0).slice(1).every(v=>v===0),finite:data.every(Number.isFinite)};effect.dispose();effect.dispose();
  // Render the actual game recording, preserving its original samples, pitch and speed.
  const decoder=new AudioContext({sampleRate:rate}),original=await decoder.decodeAudioData(await (await fetch('/audio/monster.mp3')).arrayBuffer());await decoder.close();
  const seconds=8.15,frames=Math.ceil(rate*seconds),ctx=new OfflineAudioContext(2,frames,rate),voice=ctx.createBufferSource();voice.buffer=original;
  const gain=ctx.createGain();gain.gain.value=.34;const bus=createMetallicTeaserVoice(ctx,ctx.destination);voice.connect(gain);gain.connect(bus.input);voice.start(0);voice.stop(seconds);
  const wet=await ctx.startRendering();let peak=0,energy=0,originalEnergy=0,difference=0;
  for(let c=0;c<2;c++){const a=wet.getChannelData(c),b=original.getChannelData(c);for(let i=0;i<frames;i++){const dry=b[i]*.34;peak=Math.max(peak,Math.abs(a[i]));energy+=a[i]*a[i];originalEnergy+=dry*dry;difference+=(a[i]-dry)**2;}}
  bus.dispose();
  // Optional listening artifact: same recording, processed by the production effect.
  const bytes=new ArrayBuffer(44+frames*4),view=new DataView(bytes),text=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+frames*4,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,rate,true);view.setUint32(28,rate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*4,true);
  const left=wet.getChannelData(0),right=wet.getChannelData(1);for(let i=0;i<frames;i++){view.setInt16(44+i*4,Math.round(Math.max(-1,Math.min(1,left[i]))*32767),true);view.setInt16(46+i*4,Math.round(Math.max(-1,Math.min(1,right[i]))*32767),true);}
  let binary='';const array=new Uint8Array(bytes);for(let i=0;i<array.length;i+=8192)binary+=String.fromCharCode(...array.subarray(i,i+8192));
  return {...stats,peak,rmsRatio:Math.sqrt(energy/originalEnergy),differenceRatio:Math.sqrt(difference/originalEnergy),wav:btoa(binary)};
 });
 console.log(JSON.stringify({...result,wav:undefined}));
 assert.ok(result.finite);assert.ok(result.sourceUnchanged);assert.ok(result.peak<.7,'the revised steel voice leaves room for gameplay effects');assert.ok(result.tail>.02,'the original attack is followed by a resonant steel tail');assert.ok(result.late<1e-8,'the metal resonance decays rather than feeding back indefinitely');
 assert.ok(result.peak<.95,'the actual recording retains headroom');assert.ok(result.rmsRatio>.55&&result.rmsRatio<1.3,'effect preserves useful loudness');assert.ok(result.differenceRatio>.40,'the stronger metal layer is prominent around the recognizable original cry');
 await mkdir('work/metallic-teaser',{recursive:true});await writeFile('work/metallic-teaser/monster-metallic-preview.wav',Buffer.from(result.wav,'base64'));delete result.wav;
 await page.evaluate(async()=>{
  const C=window.AudioContext,convolver=C.prototype.createConvolver,buffer=C.prototype.createBufferSource,oscillator=C.prototype.createOscillator;window.metalConvolvers=[];window.voiceSources=[];window.metalCarriers=[];
  C.prototype.createConvolver=function(){const node=convolver.call(this);metalConvolvers.push(node);return node;};
  C.prototype.createBufferSource=function(){const node=buffer.call(this);voiceSources.push(node);return node;};
  C.prototype.createOscillator=function(){const node=oscillator.call(this),stop=node.stop.bind(node);node.stop=(...args)=>{node.wasStopped=true;return stop(...args);};metalCarriers.push(node);return node;};
  const {createTeaserAudio}=await import('/src/teaser-audio.js');
  window.teaserAudio=createTeaserAudio({voices:[{at:0,end:1.1,file:'radio-out'}],soundCues:[],monsterCue:{at:1.5,end:3,file:'monster'}});teaserAudio.update(0);
 });
 await page.waitForFunction(()=>metalConvolvers.length===1&&voiceSources.filter(s=>s.buffer).length===2);
 assert.equal(await page.evaluate(()=>metalConvolvers.length),1,'only the monster receives the effect, not dialogue');
 assert.ok(await page.evaluate(()=>voiceSources.every(s=>s.playbackRate.value===1)),'no voice is pitch-shifted or time-stretched');
 await page.evaluate(()=>teaserAudio.pause());assert.ok(await page.evaluate(()=>metalConvolvers.every(n=>n.buffer===null)&&metalCarriers.every(n=>n.wasStopped)),'pause releases ringing networks and stops modulation carriers immediately');
 await page.evaluate(()=>teaserAudio.update(0,{muted:true}));await page.waitForFunction(()=>metalConvolvers.length===2);
 await page.evaluate(()=>{teaserAudio.dispose();teaserAudio.dispose();});assert.ok(await page.evaluate(()=>metalConvolvers.every(n=>n.buffer===null)&&metalCarriers.every(n=>n.wasStopped)));
 assert.deepEqual(errors,[]);console.log('PASS actual Web Audio metallic resonance, preserved source/attack, finite output, decaying tail, recording headroom and double disposal.');console.log(JSON.stringify(result));
}finally{await browser.close();}
