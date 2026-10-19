import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const context=await browser.newContext({viewport:{width:800,height:600}}),errors=[];
context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
await context.addInitScript(()=>{try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));}catch{}});
const host=await context.newPage();let guest;
try{
 await host.goto((process.env.GAME_TEST_URL||'http://localhost:5173')+'/?mode=coop-test');
 const popup=context.waitForEvent('page');await host.locator('#test-launch').click();guest=await popup;await guest.waitForLoadState();
 await Promise.all([host,guest].map(page=>page.waitForSelector('.in-waiting-room',{timeout:45000})));
 await Promise.all([host,guest].map(page=>page.evaluate(()=>monochromeTest.waitingRoom.renderer.setAnimationLoop(null))));
 await host.waitForFunction(()=>!document.querySelector('#lobby-start').disabled);await host.locator('#lobby-start').click({force:true});
 await Promise.all([host,guest].map(page=>page.waitForFunction(()=>!!window.monochrome,null,{timeout:45000})));
 // Keep real state, UI, actors and authenticated database transport. Remove GPU
 // drawing after startup so software rendering cannot distort network timings.
 // Chrome focus emulation keeps both pages visible, as on two devices.
 await Promise.all([host,guest].map(async page=>{const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});}));
 await Promise.all([host,guest].map(page=>page.evaluate(()=>{monochrome.renderer.render=()=>{};monochrome.client.voice.sendGameplay=()=>false;})));
 assert.equal(await host.evaluate(()=>monochrome.run.huntElapsed),0,'arrival does not consume the safe period');
 await Promise.all([host,guest].map(page=>page.keyboard.press('Space')));
 await Promise.all([host,guest].map(page=>page.waitForFunction(()=>!monochrome.arrival.active,null,{timeout:30000})));
 await Promise.all([host,guest].map(page=>page.evaluate(()=>{monochrome.ui.hideScreen();monochrome.input.clear();})));
 await host.evaluate(()=>{monochrome.run.huntElapsed=30;monochrome.run.boardsOpen=true;});
 await guest.waitForFunction(()=>monochrome.run.huntElapsed>=30,null,{timeout:10000});
 assert.match(await guest.locator('#hunt-clock-time').innerText(),/^1:/);
 assert.equal(await host.evaluate(()=>monochrome.simulation.enemySnapshot().active),false);
 const displayed=await Promise.all([host,guest].map(page=>page.locator('#hunt-clock-time').innerText()));
 console.log('Displayed host / guest times:',displayed);
 const minutes=text=>{const [h,m]=text.split(':').map(Number);return (h===12?0:h)*60+m;};
 assert.ok(Math.abs(minutes(displayed[0])-minutes(displayed[1]))<=1,'visible clocks compensate for database delivery delay');
 // A local pause must not stop a shared multiplayer clock.
 await guest.keyboard.press('Escape');await guest.waitForFunction(()=>monochrome.ui.overlay==='pause');
 const before=await guest.evaluate(()=>monochrome.run.huntElapsed);
 await guest.waitForFunction(value=>monochrome.run.huntElapsed>value+.5,before,{timeout:5000});
 await guest.locator('#screen-primary').click();
 await Promise.all([host,guest].map(page=>page.evaluate(()=>monochrome.ui.hideScreen())));
 await host.evaluate(()=>{monochrome.run.huntElapsed=179.4;monochrome.run.boardsOpen=false;});
 await Promise.all([host,guest].map(page=>page.waitForSelector('#hunt-warning:not([hidden])',{timeout:10000})));
 const clocks=await Promise.all([host,guest].map(page=>page.evaluate(()=>monochrome.run.huntElapsed)));
 console.log('Host / guest authoritative clock samples:',clocks);assert.ok(Math.abs(clocks[0]-clocks[1])<2,'snapshot delivery remains current');
 assert.equal(await host.evaluate(()=>monochrome.simulation.enemySnapshot().active),true);
 assert.equal(await guest.locator('#hunt-clock').isVisible(),false);
 assert.equal(await host.locator('#hunt-clock').isVisible(),false);
 // Simulate a snapshot received after the warning window: no repeated flash.
 await host.evaluate(()=>{monochrome.run.huntElapsed=190;});
 await guest.waitForFunction(()=>monochrome.run.huntElapsed>=190,null,{timeout:10000});
 await Promise.all([host,guest].map(page=>page.waitForSelector('#hunt-warning[hidden]',{state:'attached',timeout:10000})));
 assert.equal(await guest.locator('#hunt-clock').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS two real clients: arrival freeze, host clock replication, safe exploration, co-op pause, shared six warning/release and late-snapshot cleanup');
}catch(error){console.error(error);console.log(errors);for(const page of [host,guest].filter(Boolean))console.log(await page.evaluate(()=>({clock:window.monochrome?.run.huntElapsed,phase:window.monochrome?.run.phase,overlay:window.monochrome?.ui.overlay,text:document.body.innerText})).catch(()=>null));process.exitCode=1;}
finally{await Promise.all(context.pages().map(page=>page.evaluate(()=>window.monochromeTest?.client?.close()).catch(()=>{})));await browser.close();}
