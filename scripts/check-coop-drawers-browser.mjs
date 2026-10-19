import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const context=await browser.newContext({viewport:{width:800,height:600}}),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
await context.addInitScript(()=>{try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));}catch{}});
const host=await context.newPage();let guest;
async function release(page){await page.keyboard.up('KeyE');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
try{
 await host.goto((process.env.GAME_TEST_URL||'http://localhost:5173')+'/?mode=coop-test');
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
 const info=await host.evaluate(id=>{
  const g=monochrome,d=g.run.drawers.find(d=>d.key),t=g.world.targets.get(`drawer-${d.id}`),p=g.state.players.get(id),at=t.position;
  g.run.boardsOpen=true;Object.assign(p,{x:at.x,z:at.z+1.3,height:0});
  const visible=g.world.canSeeInteraction;g.world.canSeeInteraction=(p,t)=>t.type==='drawer'?false:visible(p,t);
  return {id:d.id,x:at.x,z:at.z+1.3,y:t.mesh.getWorldPosition(g.camera.position.clone()).y};
 },guestId);
 await guest.waitForFunction(at=>{const g=monochrome,p=g.state.players.get(g.client.id);return Math.hypot(p.x-at.x,p.z-at.z)<.01;},info);
 await guest.evaluate(at=>{
  const g=monochrome;g.ui.hideScreen();g.input.clear();g.input.setView(0,Math.atan2(at.y-1.65,1.3));g.renderer.domElement.focus();
  const original=g.client.send.bind(g.client);g.drawerAttempts=[];
  g.client.send=(type,payload)=>{
   if(type==='action'&&payload?.action?.code?.startsWith('drawer:')){
    g.drawerAttempts.push(payload.action.code);
    if(g.drawerAttempts.length<=2)return false;
    setTimeout(()=>original(type,payload),600);return true;
   }
   return original(type,payload);
  };
 },info);
 await guest.waitForFunction(()=>{const g=monochrome,p=g.state.players.get(g.client.id);return Math.hypot(g.camera.position.x-p.x,g.camera.position.z-p.z)<.04&&g.ui.el('interaction-label').textContent==='Search drawer';});
 await guest.keyboard.down('KeyE');await guest.waitForFunction(id=>monochrome.run.drawers[id].opened,info.id,{timeout:1500});
 assert.equal(await host.evaluate(id=>monochrome.run.drawers[id].opened,info.id),false,'visual response must precede delayed network delivery');
 await host.waitForFunction(id=>monochrome.run.drawers[id].opened,info.id,{timeout:10000});
 await guest.waitForFunction(()=>monochrome.drawerAttempts.length>=3);
 await guest.waitForTimeout(650);
 assert.equal(await host.evaluate(id=>monochrome.run.drawers[id].taken,info.id),false,'one continued E hold must not also take the key');
 assert.equal(await guest.evaluate(id=>monochrome.run.drawers[id].opened,info.id),true);
 const attempts=await guest.evaluate(()=>monochrome.drawerAttempts);assert.equal(new Set(attempts).size,1);
 await release(guest);await guest.keyboard.down('KeyE');
 await host.waitForFunction(({id,player})=>monochrome.state.players.get(player).carried.has(id),{id:info.id,player:guestId},{timeout:10000});
 await guest.waitForFunction(id=>monochrome.state.players.get(monochrome.client.id).carried.has(id),info.id,{timeout:10000});
 assert.equal(await host.evaluate(id=>monochrome.state.players.get(id).carried.size,guestId),1);
 await release(guest);await guest.keyboard.down('KeyE');
 await host.waitForFunction(id=>!monochrome.run.drawers[id].opened,info.id,{timeout:10000});await release(guest);
 for(const p of [host,guest])assert.equal(await p.evaluate(()=>monochrome.drawerMessages.some(message=>/blocks|move closer|try again|cannot do|waiting for the connection/i.test(message))),false);
 assert.deepEqual(errors,[]);console.log('PASS real authenticated co-op: immediate drawer preview despite two refused sends and 600ms delay, cabinet occlusion ignored, stale snapshots do not snap it shut, continued E cannot toggle/take twice, authoritative key collection and closing, no drawer errors');
}catch(error){console.error(error);for(const p of [host,guest].filter(Boolean))console.log(await p.evaluate(()=>({messages:window.monochrome?.drawerMessages,attempts:window.monochrome?.drawerAttempts,overlay:window.monochrome?.ui.overlay,label:document.querySelector('#interaction-label')?.textContent})).catch(()=>null));console.log(errors);process.exitCode=1;}
finally{await Promise.all(context.pages().map(p=>p.evaluate(()=>window.monochromeTest?.client?.close()).catch(()=>{})));await browser.close();}
