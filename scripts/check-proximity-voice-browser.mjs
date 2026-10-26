import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=await mkdtemp(join(tmpdir(),'monochrome-proximity-')),file=join(temp,'voice.wav');
const count=48000*4,wav=Buffer.alloc(44+count*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
for(let i=0;i<count;i++)wav.writeInt16LE(Math.round(5000*(Math.sin(i*2*Math.PI*500/48000)+.4*Math.sin(i*2*Math.PI*1300/48000))),44+i*2);await writeFile(file,wav);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+file]}),context=await browser.newContext({permissions:['microphone']}),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
await context.addInitScript(()=>{
 const capture=navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);if(!capture)return;
 navigator.mediaDevices.getUserMedia=options=>capture({...options,audio:{...options.audio,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
 const C=AudioContext;window.voiceOutputs=[];
 window.AudioContext=class extends C{createPanner(){const p=super.createPanner(),split=this.createChannelSplitter(2),channels=[this.createAnalyser(),this.createAnalyser()],zero=this.createGain();zero.gain.value=0;zero.connect(this.destination);p.connect(split);
  channels.forEach((a,i)=>{a.fftSize=2048;split.connect(a,i);a.connect(zero);});voiceOutputs.push(channels);return p;}};
 window.voiceEnergy=()=>voiceOutputs.at(-1).map(a=>{const samples=new Float32Array(a.fftSize);a.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((n,x)=>n+x*x,0)/samples.length);});
});
const pages=[await context.newPage(),await context.newPage()],base=process.env.GAME_TEST_URL||'http://localhost:5182',channelId='voice-'+Date.now();
async function measure(pose){await pages[0].evaluate(p=>setVoicePose(p),pose);await pages[0].waitForTimeout(450);return pages[0].evaluate(()=>voiceEnergy());}
try{
 await Promise.all(pages.map(p=>p.goto(base+'/scripts/fixtures/voice-proximity.html')));
 await Promise.all(pages.map((p,i)=>p.evaluate(config=>bootVoice(config),{id:i?'b':'a',channelId,iceServers:JSON.parse(process.env.VOICE_TEST_ICE_SERVERS||'[]')})));
 await Promise.all(pages.map(p=>p.evaluate(()=>joinVoice())));
 await Promise.all(pages.map(p=>p.getByRole('button',{name:'Mic off',exact:false}).click()));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>[...voice.peers.values()].every(p=>p.pc.connectionState==='connected'&&p.spatial&&p.remoteMuted===false),null,{timeout:20000})));
 await pages[0].waitForTimeout(700);
 const near=await measure({x:2}),middle=await measure({x:8}),far=await measure({x:18}),right=await measure({x:4}),left=await measure({x:-4}),turned=await measure({x:4,yaw:Math.PI}),front=await measure({x:4,yaw:-Math.PI/2});
 const level=row=>Math.hypot(...row);
 assert.ok(level(near)>.005,'actual incoming WebRTC microphone is audible nearby');assert.ok(level(middle)<level(near)*.1&&level(middle)>level(near)*.005,'middle distance is very quiet but audible');assert.ok(level(far)<1e-7,'far voice is completely silent');
 assert.ok(right[1]>right[0]*1.4,'friend to the right is heard on the right');assert.ok(left[0]>left[1]*1.4,'friend to the left is heard on the left');assert.ok(turned[0]>turned[1]*1.4,'turning reverses the ear direction');assert.ok(Math.max(...front)/Math.min(...front)<1.15,'facing the friend centres the voice');
 const routing=await pages[0].evaluate(()=>{const p=[...voice.peers.values()][0];return {muted:p.audio.muted,spatial:!!p.spatial,connected:p.pc.connectionState};});assert.equal(routing.muted,true,'raw audio element must not bypass distance or double the voice');assert.equal(routing.connected,'connected');
 await pages[1].getByRole('button',{name:'Mic on',exact:false}).click();await pages[0].waitForTimeout(400);assert.ok(level(await pages[0].evaluate(()=>voiceEnergy()))<1e-7,'microphone mute stops the remote voice');
 await pages[1].getByRole('button',{name:'Mic off',exact:false}).click();assert.ok(level(await measure({x:2}))>.005,'unmuting restores the same positional path');
 const inactive=await measure({x:2,active:false});assert.ok(level(inactive)<1e-7,'scene handoff and disconnection silence voices');
 await pages[0].waitForFunction(()=>voice.gameConnected('b'));await pages[1].evaluate(()=>{window.peerPackets=[];voice.subscribeGameplay(e=>peerPackets.push(e));});assert.equal(await pages[0].evaluate(()=>voice.sendGameplay('b','input',{input:{forward:1}})),true);await pages[1].waitForFunction(()=>peerPackets.length===1);
 // The real waiting-room and co-op scene, rather than a separate tester-only audio path.
 for(const kind of ['waiting','game']){
  await pages[0].evaluate(kind=>startVoiceScene(kind),kind);await pages[0].waitForFunction(()=>window.lastVoiceFrame?.players?.length===2&&window.lastVoiceFrame.active!==false);
  const integration=await pages[0].evaluate(()=>({listener:lastVoiceFrame.listener,camera:voiceScene.camera.position.toArray(),friend:lastVoiceFrame.players.find(p=>p.id==='b')}));
  assert.ok(integration.friend&&Number.isFinite(integration.friend.x));assert.ok(Math.abs(integration.listener.x-integration.camera[0])<.01&&Math.abs(integration.listener.z-integration.camera[2])<.01,'voice follows the actual scene camera');
  await pages[0].evaluate(()=>stopVoiceScene());
 }
 await Promise.all(pages.map(p=>p.evaluate(()=>leaveVoice())));assert.deepEqual(errors,[]);
 console.log('PASS real two-peer WebRTC: quiet middle distance, silent far distance, HRTF left/right and camera turns, no raw-audio bypass, mute/unmute, scene cleanup, unchanged gameplay data channel',{near,middle,far,right,left,turned,front});
}catch(error){console.error('Voice verification diagnostics',errors,await Promise.all(pages.map(p=>p.evaluate(()=>[...voice.peers.values()].map(p=>({connection:p.pc.connectionState,ice:p.pc.iceConnectionState,gathering:p.pc.iceGatheringState,candidates:(p.pc.localDescription?.sdp.match(/a=candidate:/g)||[]).length,remote:!!p.pc.remoteDescription,signal:p.pc.signalingState,spatial:!!p.spatial,muted:p.remoteMuted,notice:document.querySelector('#voice-notice').textContent}))).catch(()=>null))));throw error;
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
