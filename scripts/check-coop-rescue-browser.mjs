import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:800,height:600}}),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
await context.addInitScript(()=>{try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));}catch{}});
const host=await context.newPage();let guest;
try{
 await host.goto((process.env.GAME_TEST_URL||'http://localhost:5173')+'/?mode=coop-test');const popup=context.waitForEvent('page');await host.locator('#test-launch').click();guest=await popup;await guest.waitForLoadState();
 await Promise.all([host,guest].map(p=>p.waitForSelector('.in-waiting-room',{timeout:45000})));
 await Promise.all([host,guest].map(p=>p.evaluate(()=>monochromeTest.waitingRoom.renderer.setAnimationLoop(null))));
 await host.waitForFunction(()=>!document.querySelector('#lobby-start').disabled);await host.locator('#lobby-start').click({force:true});
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!!window.monochrome,null,{timeout:45000})));
 await Promise.all([host,guest].map(async p=>{const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});await p.evaluate(()=>{monochrome.renderer.render=()=>{};monochrome.client.voice.sendGameplay=()=>false;});}));
 await Promise.all([host,guest].map(p=>p.keyboard.press('Space')));await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!monochrome.arrival.active,null,{timeout:30000})));

 const drawer=await host.evaluate(()=>{
  const game=monochrome,p=game.state.players.get(game.client.id),target=game.world.targets.get('drawer-0'),at=target.position;
  Object.assign(p,{x:at.x,z:at.z+1.3,height:at.height});
  const visible=game.world.canSeeInteraction(p,target),opened=game.simulation.interact(p.id,{targetId:target.id});
  const before=game.simulation.snapshot().notices.length;
  Object.assign(p,{x:at.x,z:at.z-1,height:at.height});
  const blocked=game.simulation.interact(p.id,{targetId:target.id}),after=game.simulation.snapshot().notices.length;
  Object.assign(p,{x:at.x,z:at.z+1.3,height:at.height});
  return {visible,opened,blocked,before,after};
 });
 assert.equal(drawer.visible,true);assert.equal(drawer.opened.ok,true);assert.equal(drawer.blocked.reason,'blocked');assert.equal(drawer.after,drawer.before);
 const guestId=await guest.evaluate(()=>monochrome.client.id);
 const deadline=await host.evaluate(async id=>{
  const {downPlayer}=await import('/src/coop-state.js'),g=monochrome,p=g.state.players.get(id),rescuer=g.state.players.get(g.client.id);
  Object.assign(p,{x:rescuer.x+.5,z:rescuer.z,height:rescuer.height});
  downPlayer(g.state,id,g.run.elapsed);return p.downedUntil-g.run.elapsed;
 },guestId);
 assert.equal(deadline,45);
 await guest.waitForFunction(()=>monochrome.state.players.get(monochrome.client.id)?.status==='downed');
 await guest.locator('#screen-content').getByText(/45 seconds/).waitFor({timeout:15000});
 const replicated=await guest.evaluate(()=>{const g=monochrome,p=g.state.players.get(g.client.id);return p.downedUntil-g.run.elapsed;});assert.ok(replicated>40&&replicated<=45);
 const rescue=await host.evaluate(id=>{monochrome.run.elapsed+=30;return monochrome.simulation.interact(monochrome.client.id,{targetId:`revive:${id}`});},guestId);
 assert.equal(rescue.ok,true);await guest.waitForFunction(()=>monochrome.state.players.get(monochrome.client.id)?.status==='alive');
 assert.deepEqual(errors,[]);console.log('PASS real cabinet opens from the front, occluded drawer stays blocked without warning, 45-second deadline reaches guest HUD, late rescue at 30 seconds replicates over database fallback');
}catch(e){console.error(e);console.log(errors);process.exitCode=1;}
finally{await Promise.all(context.pages().map(p=>p.evaluate(()=>window.monochromeTest?.client?.close()).catch(()=>{})));await browser.close();}
