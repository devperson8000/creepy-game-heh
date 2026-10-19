import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:800,height:600}}),errors=[],peer=!!process.env.VOICE_TEST_ICE_SERVERS,failure=!!process.env.FINALE_TEST_RENDER_FAILURE;
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
await context.addInitScript(()=>{try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));}catch{}});
if(peer)await context.addInitScript(servers=>{const Peer=RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(config){super({...config,iceServers:servers});}};},JSON.parse(process.env.VOICE_TEST_ICE_SERVERS));
const host=await context.newPage();let guest;
try{
 await host.goto((process.env.GAME_TEST_URL||'http://localhost:5173')+'/?mode=coop-test');const popup=context.waitForEvent('page');await host.locator('#test-launch').click();guest=await popup;await guest.waitForLoadState();
 await Promise.all([host,guest].map(p=>p.waitForSelector('.in-waiting-room',{timeout:45000})));
 await Promise.all([host,guest].map(p=>p.evaluate(()=>monochromeTest.waitingRoom.renderer.setAnimationLoop(null))));
 await host.waitForFunction(()=>!document.querySelector('#lobby-start').disabled);await host.locator('#lobby-start').click({force:true});
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!!window.monochrome,null,{timeout:45000})));
 await Promise.all([host,guest].map(p=>p.evaluate(({peer,failure})=>{monochrome.renderer.render=scene=>{if(failure&&scene.name==='monochrome-finale')throw new Error('Simulated cinematic renderer failure');};if(!peer)monochrome.client.voice.sendGameplay=()=>false;else{window.finalePeerSnapshots=0;monochrome.client.voice.subscribeGameplay(event=>{if(event.type==='snapshot')finalePeerSnapshots++;});}},{peer,failure})));
 await Promise.all([host,guest].map(p=>p.keyboard.press('Space')));await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!monochrome.arrival.active,null,{timeout:30000})));
 await host.evaluate(()=>{const run=monochrome.run;for(const d of run.drawers.filter(d=>d.key))run.banked.add(d.id);run.codeAccepted=true;});
 if(failure){
  await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochrome.ui.overlay==='finale',null,{timeout:10000})));
  assert.equal(await guest.locator('.finale-ui').count(),0,'failed initialization removes the cinematic overlay');
  await host.evaluate(()=>{monochrome.run.finale.startedAt-=55;});
  await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochrome.run.phase==='won'&&monochrome.ui.overlay==='won',null,{timeout:15000})));assert.deepEqual(errors,[]);console.log('PASS cinematic renderer failure releases overlays and still shows authoritative co-op victory');
 }else{
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!!monochrome.finale?.ready,null,{timeout:10000})));
 if(peer)await guest.waitForFunction(()=>window.finalePeerSnapshots>0,null,{timeout:15000});
 assert.equal(await guest.locator('#game-ui').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochrome.finale.time>2,null,{timeout:10000})));
 const clock=await Promise.all([host,guest].map(p=>p.evaluate(()=>monochrome.finale.time)));console.log('Finale clock samples:',clock);assert.ok(Math.abs(clock[0]-clock[1])<.8,`synchronized clocks ${clock}`);
 await guest.getByRole('button',{name:'Mute finale',exact:true}).click();
 assert.equal(await guest.evaluate(()=>monochrome.monsterAudio.muted),true,'finale button updates shared game mute');
 await guest.keyboard.press('KeyM');assert.equal(await guest.evaluate(()=>monochrome.finale.audio.muted),false,'M unmutes after the button');
 assert.equal(await guest.getByRole('button',{name:'Mute finale',exact:true}).innerText(),'Sound on');
 await guest.keyboard.press('KeyM');assert.equal(await guest.getByRole('button',{name:'Unmute finale',exact:true}).innerText(),'Sound off','M refreshes the finale label');
 await guest.getByRole('button',{name:'Unmute finale',exact:true}).click();assert.equal(await guest.evaluate(()=>monochrome.monsterAudio.muted),false,'button unmutes after M');

 await host.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));const before=await guest.evaluate(()=>monochrome.finale.time);await guest.waitForTimeout(1100);assert.ok(await guest.evaluate(t=>monochrome.finale.time>t+.7,before));
 // Exercise a large authoritative seek, as happens when returning to a long-hidden viewer.
 await host.evaluate(()=>{monochrome.run.finale.startedAt-=47;});await guest.waitForFunction(()=>monochrome.finale?.time>47||monochrome.run.phase==='won',null,{timeout:10000});
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochrome.run.phase==='won'&&monochrome.ui.overlay==='won',null,{timeout:16000})));
 assert.deepEqual(errors,[]);console.log('PASS actual co-op victory trigger, shared finale, hidden HUD, synchronized clocks, hidden host, late catch-up and final victory over '+(peer?'peer transport':'database fallback')+'; no runtime errors');
 }
}catch(e){console.error(e);console.log(errors);for(const p of [host,guest].filter(Boolean))console.log(await p.evaluate(()=>({phase:window.monochrome?.run.phase,finale:window.monochrome?.run.finale,overlay:window.monochrome?.ui.overlay,text:document.body.innerText})).catch(()=>null));process.exitCode=1;}
finally{await Promise.all(context.pages().map(p=>p.evaluate(()=>window.monochromeTest?.client?.close()).catch(()=>{})));await browser.close();}
