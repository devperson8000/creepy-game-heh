import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.GAME_TEST_URL||'http://localhost:5173'));
 await page.locator('#lobby-singleplayer').click();
 await page.waitForFunction(()=>!!window.monochrome);
 await page.evaluate(()=>{monochrome.renderer.setPixelRatio(.5);monochrome.renderer.setSize(innerWidth,innerHeight);});
 await page.evaluate(()=>document.querySelector('.arrival-skip')?.click());
 await page.waitForFunction(()=>!monochrome.arrival.active);
 await page.evaluate(()=>{document.exitPointerLock?.();});
 await page.waitForFunction(()=>monochrome.ui.overlay==='pause');
 assert.equal(await page.locator('#screen-primary').evaluate(el=>document.activeElement===el),true);
 await page.locator('[data-preference="sensitivity"]').fill('1.5');
 await page.locator('[data-preference="quality"]').selectOption('low');
 await page.locator('[data-preference="brightness"]').fill('1.2');
 await page.locator('[data-preference="reducedMotion"]').check();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('monochrome.settings')).sensitivity),1.5);
 await page.screenshot({path:'work/polished-pause-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/polished-pause-mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#screen-primary').click();
 await page.waitForFunction(()=>monochrome.ui.overlay===null);
 // Aim at the real keypad and exercise hold-to-interact plus both code outcomes.
 await page.evaluate(()=>{const game=monochrome,target=game.world.targets.get('keypad').mesh.position;game.player.x=target.x;game.player.z=target.z+1.2;game.input.setView(0,Math.atan2(target.y-5.25,1.2));});
 await page.waitForFunction(()=>monochrome.ui.el('interaction-label').textContent==='Enter elevator code');
 await page.keyboard.down('KeyE');await page.waitForSelector('#keypad-dialog:not([hidden])');await page.keyboard.up('KeyE');
 const code=await page.evaluate(()=>monochrome.run.code);
 await page.keyboard.type(code==='0000'?'0001':'0000');await page.keyboard.press('Enter');
 assert.match(await page.locator('#keypad-feedback').innerText(),/denied/);
 await page.keyboard.type(code);await page.keyboard.press('Enter');await page.waitForFunction(()=>monochrome.run.codeAccepted);
 // Place the actual enemy at an exposed player to exercise capture and the wired retry.
 await page.evaluate(()=>{const game=monochrome;game.run.boardsOpen=true;game.run.huntElapsed=190;game.player.x=-2.6;game.player.z=-18.2;game.enemy().released=true;game.enemy().position={x:-2.6,z:-18};game.enemy().yaw=Math.PI;});
 await page.waitForFunction(()=>monochrome.ui.overlay==='dead',null,{timeout:30000});
 assert.match(await page.locator('#screen-content').innerText(),/banked keys are safe/);
 await page.locator('#screen-primary').click();await page.waitForFunction(()=>monochrome.run.phase==='playing'&&!monochrome.ui.overlay);
 // Trigger the real exit condition after satisfying the run's locks.
 await page.evaluate(()=>{const game=monochrome;for(const d of game.run.drawers.filter(d=>d.key))game.run.banked.add(d.id);game.run.codeAccepted=true;game.run.exitOpen=true;game.world.update(1,0,game.player,0);game.player.x=-2.6;game.player.z=-34;});
 await page.waitForFunction(()=>monochrome.run.phase==='won');assert.match(await page.locator('#screen-content').innerText(),/YOU GOT OUT/);
 assert.deepEqual(errors,[]);console.log('PASS arrival skip, solo start, focused pause, saved settings, mobile layout, resume, real keypad rejection/acceptance, monster capture, retry and elevator escape; no runtime errors');
}catch(error){console.error(error);console.log(errors);console.log(await page.evaluate(()=>({overlay:window.monochrome?.ui.overlay,keys:[...(window.monochrome?.input.keys??[])],prompt:document.querySelector('#interaction-label')?.textContent,lock:!!document.pointerLockElement})));process.exitCode=1;}
finally{await browser.close();}
