import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const temp=await mkdtemp(join(tmpdir(),'monochrome-voice-')),tone=join(temp,'mic.wav');
const samples=48000*4,wav=Buffer.alloc(44+samples*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(8000*Math.sin(i*2*Math.PI*220/48000)),44+i*2);await writeFile(tone,wav);
const origin=process.env.GAME_TEST_URL||'http://localhost:5173';

const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+tone]});
const context=await b.newContext({permissions:['microphone'],viewport:{width:1050,height:760}}),errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
if(process.env.VOICE_TEST_ICE_SERVERS){
 const ice=JSON.parse(process.env.VOICE_TEST_ICE_SERVERS);
 await context.addInitScript(servers=>{const Peer=window.RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(config){super({...config,iceServers:servers});}};},ice);
}
// Keep the synthetic capture tone out of browser speech/noise suppression.
await context.addInitScript(()=>{
 const capture=navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);if(!capture)return;
 navigator.mediaDevices.getUserMedia=options=>capture({...options,audio:options.audio?{...(typeof options.audio==='object'?options.audio:{}),echoCancellation:false,noiseSuppression:false,autoGainControl:false}:options.audio});
});
const host=await context.newPage();let guest;
try{
 await host.goto(origin+'/?mode=coop-test');
 const popup=context.waitForEvent('page');await host.locator('#test-launch').click();guest=await popup;await guest.waitForLoadState();
 await Promise.all([host,guest].map(p=>p.waitForSelector('.in-waiting-room',{timeout:45000})));
 assert.equal(await context.pages().length,2);
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochromeTest.waitingRoom?.avatars.size===1,null,{timeout:30000})));
 await Promise.all([host,guest].map(p=>p.locator('#voice-toggle').click()));
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>[...monochromeTest.client.voice.peers.values()][0]?.pc.connectionState==='connected',null,{timeout:20000})));
 await host.waitForFunction(()=>[...monochromeTest.waitingRoom.avatars.values()][0].root.getObjectByName('player-speaking').visible,null,{timeout:15000});
 await guest.locator('#voice-toggle').click();
 await host.waitForFunction(()=>![...monochromeTest.waitingRoom.avatars.values()][0].root.getObjectByName('player-speaking').visible);
 assert.equal(await guest.evaluate(()=>monochromeTest.client.voice.muted),true);
 assert.equal(await guest.evaluate(()=>[...monochromeTest.client.voice.peers.values()][0].sender.track),null);
 await guest.evaluate(()=>{window.originalMic=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));});
 await guest.locator('#voice-toggle').click();await guest.waitForFunction(()=>document.querySelector('#voice-notice').textContent.includes('blocked'));
 assert.equal(await guest.evaluate(()=>monochromeTest.client.voice.muted),true);
 await guest.evaluate(()=>{navigator.mediaDevices.getUserMedia=originalMic});await guest.locator('#voice-toggle').click();
 await host.waitForFunction(()=>[...monochromeTest.waitingRoom.avatars.values()][0].root.getObjectByName('player-speaking').visible);
 await host.screenshot({path:join(temp,'waiting-voice.png')});
 console.log('PASS same-browser launch, distinct players, automatic approval and ready, both real avatars, live voice and overhead microphone');
 const before=await guest.evaluate(()=>monochromeTest.waitingRoom.own.z);
 await guest.keyboard.down('KeyW');await guest.waitForTimeout(500);await guest.keyboard.up('KeyW');
 assert.ok(await guest.evaluate(z=>monochromeTest.waitingRoom.own.z<z,before));
 await host.locator('#lobby-start').click({force:true});
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>window.monochrome?.arrival,null,{timeout:45000})));
 await Promise.all([host,guest].map(p=>p.evaluate(()=>{monochrome.renderer.setPixelRatio(.4);monochrome.renderer.setSize(innerWidth,innerHeight);monochrome.renderer.render=()=>{};})));
 // Exercise the hidden-host fallback that keeps tab 2's round alive.
 await host.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!monochrome.arrival.active,null,{timeout:40000})));
 await guest.evaluate(()=>{monochrome.ui.hideScreen();monochrome.input.clear()});
 await Promise.all([host,guest].map(p=>p.evaluate(()=>{
  window.gameTelemetry={peerInputs:0,peerSnapshots:0,databaseInputs:0};
  monochrome.client.voice.subscribeGameplay(event=>{if(event.type==='input')gameTelemetry.peerInputs++;if(event.type==='snapshot')gameTelemetry.peerSnapshots++;});
  const send=monochrome.client.send.bind(monochrome.client);monochrome.client.send=(type,payload)=>{if(type==='input')gameTelemetry.databaseInputs++;return send(type,payload);};
 })));
 await guest.keyboard.down('KeyW');await guest.waitForTimeout(600);await guest.keyboard.up('KeyW');
 await host.waitForFunction(()=>monochrome.state.players.get([...monochrome.state.players.keys()].find(id=>id!==monochrome.client.id)).z>-30,null,{timeout:10000});
 assert.ok(await host.evaluate(()=>monochrome.run.elapsed>0));
 await host.waitForFunction(()=>gameTelemetry.peerInputs>0,null,{timeout:10000});
 await guest.waitForFunction(()=>gameTelemetry.peerSnapshots>0,null,{timeout:10000});
 console.log('Peer gameplay:',await host.evaluate(()=>gameTelemetry),await guest.evaluate(()=>gameTelemetry));
 await host.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});});
 assert.equal(await host.evaluate(()=>[...monochrome.client.voice.peers.values()][0].pc.connectionState),'connected');
 await guest.keyboard.press('KeyF');await host.waitForFunction(()=>[...monochrome.state.players.values()].find(p=>p.id!==monochrome.client.id).torch===false);
 assert.equal(await guest.evaluate(()=>monochrome.torch.on),false);
 await guest.keyboard.down('Shift');await guest.keyboard.down('KeyW');
 await host.waitForFunction(()=>[...monochrome.state.players.values()].some(p=>p.id!==monochrome.client.id&&p.sprint&&p.moving));
 const bones=()=>{const result=[];for(const [id,avatar] of monochrome.avatars)if(id!==monochrome.client.id)avatar.root.traverse(node=>{if(node.isBone)result.push(...node.quaternion.toArray())});return result;};
 const a=await host.evaluate(bones);await guest.waitForTimeout(220);const z=await host.evaluate(bones);
 await guest.keyboard.up('KeyW');await guest.keyboard.up('Shift');assert.ok(a.some((value,index)=>Math.abs(value-z[index])>.001),'remote running animates the real hazmat skeleton');
 await guest.screenshot({path:join(temp,'game.png')});
 assert.deepEqual(errors,[]);console.log('PASS both opening sequences, gameplay with hidden host, replicated movement and torch, persistent voice; no browser errors');
}catch(e){console.log('FAIL',e.message,errors);for(const p of [host,guest].filter(Boolean))console.log(await p.evaluate(()=>({text:document.body.innerText,arrival:window.monochrome?.arrival?.elapsed,error:document.querySelector('#error')?.innerText,peers:[...monochromeTest.client.voice.peers.values()].map(p=>({state:p.pc.connectionState,config:p.pc.getConfiguration(),local:!!p.pc.localDescription,remote:!!p.pc.remoteDescription}))})).catch(()=>null));process.exitCode=1;}
finally{await Promise.all(context.pages().map(p=>p.evaluate(()=>monochromeTest?.client?.close()).catch(()=>{})));await b.close();await rm(temp,{recursive:true,force:true});}
