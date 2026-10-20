import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const context=await browser.newContext({viewport:{width:800,height:600}}),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
await context.addInitScript(()=>{try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));}catch{}});
const host=await context.newPage();let guest;
async function release(page){await page.keyboard.up('KeyE');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
try{
 await host.goto((process.env.GAME_TEST_URL||'http://localhost:5173')+'/?mode=coop-test&halloween=preview');
 const popup=context.waitForEvent('page');await host.locator('#test-launch').click();guest=await popup;await guest.waitForLoadState();
 await Promise.all([host,guest].map(p=>p.waitForSelector('.in-waiting-room',{timeout:45000})));
 await Promise.all([host,guest].map(p=>p.evaluate(()=>monochromeTest.waitingRoom.renderer.setAnimationLoop(null))));
 await host.waitForFunction(()=>!document.querySelector('#lobby-start').disabled);await host.locator('#lobby-start').click({force:true});
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!!window.monochrome,null,{timeout:45000})));
 await Promise.all([host,guest].map(async p=>{
  const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await p.evaluate(()=>{const g=monochrome;g.renderer.render=()=>{};g.client.voice.sendGameplay=()=>false;const update=g.world.update;g.world.update=(...args)=>{update(...args);g.world.scene.updateMatrixWorld(true);};g.drawerMessages=[];const toast=g.ui.toast;g.ui.toast=message=>{g.drawerMessages.push(message);toast(message);};});
 }));
 await Promise.all([host,guest].map(p=>p.keyboard.press('Space')));
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!monochrome.arrival.active,null,{timeout:30000})));
 const guestId=await guest.evaluate(()=>monochrome.client.id);
 assert.equal(await host.evaluate(()=>!!monochrome.run.halloween),true);
 assert.equal(await guest.evaluate(()=>!!monochrome.run.halloween),true,'guest must pin the host season without a preview URL');
 await host.evaluate(async()=>{
  const {interactHalloween}=await import('/src/halloween-state.js');const g=monochrome;
  for(const id of ['invitation','seal-0','seal-1','seal-2','chest'])interactHalloween(g.run,'halloween:'+id);
  for(const p of g.state.players.values())Object.assign(p,{x:-3.5,z:-31,height:3.6});
  g.simulation.interact(g.client.id,{targetId:'halloween:b2-panel'});g.run.halloween.visit.startedAt-=6;
 });
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochrome.run.halloween.visit?.stage==='archive')));
 await guest.evaluate(()=>{monochrome.renderer.domElement.focus();monochrome.input.setView(0);});
 const before=await guest.evaluate(()=>monochrome.state.players.get(monochrome.client.id).z);
 await guest.keyboard.down('KeyW');await guest.waitForTimeout(450);await guest.keyboard.up('KeyW');
 await host.waitForFunction(({id,z})=>monochrome.state.players.get(id).z<z-.3,{id:guestId,z:before});
 assert.equal(await guest.evaluate(()=>monochrome.state.players.get(monochrome.client.id).height),0);
 await host.evaluate(()=>{const p=monochrome.state.players.get(monochrome.client.id);Object.assign(p,{x:0,z:-.6,height:0});});
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochrome.run.halloween.visit.stage==='conversation')));
 await host.evaluate(()=>monochrome.run.halloween.visit.startedAt-=26);
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochrome.run.halloween.seen&&monochrome.run.halloween.visit.stage==='archive')));
 await host.evaluate(()=>{for(const p of monochrome.state.players.values())Object.assign(p,{x:0,z:3.2,height:0});});
 await guest.waitForFunction(()=>!document.querySelector('.b2-return').disabled);await guest.click('.b2-return');
 await host.waitForFunction(()=>monochrome.run.halloween.visit.stage==='return');await host.evaluate(()=>monochrome.run.halloween.visit.startedAt-=5);
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>monochrome.run.phase==='playing')));
 assert.equal(await guest.evaluate(()=>monochrome.state.players.get(monochrome.client.id).height),3.6);
 assert.equal(await guest.evaluate(()=>monochrome.run.halloween.key),true);
 assert.deepEqual(errors,[]);console.log('PASS authenticated 2-player Halloween layout pinning, shared B2 entry, guest movement, synchronized encounter, guest return control, preserved quest and upstairs poses.');
}catch(error){console.error(error);for(const p of [host,guest].filter(Boolean))console.log(await p.evaluate(()=>({messages:window.monochrome?.drawerMessages,attempts:window.monochrome?.drawerAttempts,overlay:window.monochrome?.ui.overlay,label:document.querySelector('#interaction-label')?.textContent})).catch(()=>null));console.log(errors);process.exitCode=1;}
finally{await Promise.all(context.pages().map(p=>p.evaluate(()=>window.monochromeTest?.client?.close()).catch(()=>{})));await browser.close();}
