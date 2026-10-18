import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:800,height:600}}),errors=[],usePeer=!!process.env.VOICE_TEST_ICE_SERVERS;
if(usePeer)await context.addInitScript(servers=>{const Peer=RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(config){super({...config,iceServers:servers});}};},JSON.parse(process.env.VOICE_TEST_ICE_SERVERS));
context.on('page',p=>p.on('pageerror',error=>errors.push(error.message)));
// Default to the database fallback; VOICE_TEST_ICE_SERVERS also checks actual peer gameplay.
await context.addInitScript(()=>{try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));}catch{}});
const host=await context.newPage();let guest;
try{
 await host.goto((process.env.GAME_TEST_URL||'http://localhost:5173')+'/?mode=coop-test');
 const popup=context.waitForEvent('page');await host.locator('#test-launch').click();guest=await popup;await guest.waitForLoadState();
 await Promise.all([host,guest].map(p=>p.waitForSelector('.in-waiting-room',{timeout:45000})));
 await Promise.all([host,guest].map(p=>p.evaluate(()=>{monochromeTest.waitingRoom.renderer.setAnimationLoop(null);})));
 await host.waitForFunction(()=>!document.querySelector('#lobby-start').disabled);
 await host.locator('#lobby-start').click({force:true});
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!!window.monochrome,{timeout:45000})));
 await Promise.all([host,guest].map(p=>p.evaluate(usePeer=>{monochrome.renderer.setPixelRatio(.5);if(!usePeer)monochrome.client.voice.sendGameplay=()=>false;},usePeer)));
 await Promise.all([host,guest].map(p=>p.keyboard.press('Space')));
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!monochrome.arrival.active,{},{timeout:45000})));
 await Promise.all([host,guest].map(p=>p.evaluate(()=>{monochrome.ui.hideScreen();monochrome.input.clear();})));
 // Network assertions run without GPU drawing; the complete simulation, inputs, avatar interpolation and real transport keep ticking.
 await Promise.all([host,guest].map(p=>p.evaluate(()=>{monochrome.renderer.render=()=>{};})));
 await host.bringToFront();
 await Promise.all([host,guest].map(p=>p.evaluate(()=>{monochrome.ui.hideScreen();monochrome.input.clear();})));
 await host.waitForFunction(()=>monochrome.avatars.size>0);
 await Promise.all([host,guest].map(p=>p.evaluate(()=>{window.peerEvents=0;monochrome.client.voice.subscribeGameplay(()=>peerEvents++);})));
 await host.evaluate(()=>{window.remoteFrames=[];window.remoteTimer=setInterval(()=>{const other=[...monochrome.avatars.values()][0];if(other)remoteFrames.push({z:other.root.position.z,t:performance.now()});},16);});
 await guest.evaluate(()=>{
  const game=monochrome,own=()=>game.state.players.get(game.client.id);window.motionSamples=[];
  const start=performance.now();window.motionTimer=setInterval(()=>{window.motionSamples.push({t:performance.now()-start,z:own().z,camera:game.camera.position.z,ack:own().inputSequence??0});},16);
 });
 // Drive the existing controller while the other tab stays visible for avatar measurements.
 await guest.evaluate(()=>{monochrome.ui.hideScreen();monochrome.renderer.domElement.focus();monochrome.input.keys.add('KeyW');});
 await guest.waitForTimeout(2200);await guest.evaluate(()=>monochrome.input.keys.delete('KeyW'));await guest.waitForTimeout(1000);
 const metrics=await guest.evaluate(()=>{
  clearInterval(window.motionTimer);const samples=window.motionSamples;let reverse=0,worst=0;
  for(let i=1;i<samples.length;i++){const delta=samples[i].z-samples[i-1].z;if(delta<-.02){reverse++;worst=Math.min(worst,delta);}}
  return {samples:samples.length,reverse,worst,from:samples[0].z,to:samples.at(-1).z,ack:samples.at(-1).ack};
 });
 console.log('Guest movement metrics:',metrics);
 const remote=await host.evaluate(()=>{clearInterval(remoteTimer);let reverse=0,worst=0;for(let i=1;i<remoteFrames.length;i++){const d=remoteFrames[i].z-remoteFrames[i-1].z;if(d<-.03)reverse++;worst=Math.max(worst,Math.abs(d));}return{samples:remoteFrames.length,reverse,largestStep:worst,from:remoteFrames[0]?.z,to:remoteFrames.at(-1)?.z};});
 console.log('Remote avatar metrics:',remote);assert.ok(remote.samples>10);assert.ok(remote.to>remote.from+1,'the visible remote avatar actually moves');assert.equal(remote.reverse,0);assert.ok(remote.largestStep<.4,'remote motion has no large per-frame jumps');
 if(usePeer){await guest.waitForFunction(()=>peerEvents>0,null,{timeout:10000});await host.waitForFunction(()=>peerEvents>0,null,{timeout:10000});console.log('Peer channel messages:',await host.evaluate(()=>peerEvents),await guest.evaluate(()=>peerEvents));}
 assert.ok(metrics.ack>0,'host acknowledges actual movement commands');assert.ok(metrics.to>metrics.from+1);assert.equal(metrics.reverse,0,'no position snapbacks during uninterrupted forward movement');
 await host.waitForFunction(()=>[...monochrome.state.players.values()].some(p=>p.id!==monochrome.client.id&&p.inputSequence>0));
 await host.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});});
 await guest.keyboard.down('KeyA');await guest.waitForTimeout(600);await guest.keyboard.up('KeyA');
 await guest.keyboard.press('KeyF');await host.waitForFunction(()=>[...monochrome.state.players.values()].find(p=>p.id!==monochrome.client.id).torch===false);
 assert.deepEqual(errors,[]);console.log('PASS real two-player '+(usePeer?'peer transport':'database fallback')+', command acknowledgements, forward movement without snapback, hidden host, replicated torch; no runtime errors');
}catch(error){console.error(error);for(const p of [host,guest].filter(Boolean))console.log(await p.evaluate(()=>({text:document.body.innerText,own:window.monochrome&&[...monochrome.state.players.values()],error:document.querySelector('#error')?.textContent})).catch(()=>null));process.exitCode=1;}
finally{await Promise.all(context.pages().map(p=>p.evaluate(()=>window.monochromeTest?.client?.close()).catch(()=>{})));await browser.close();}
