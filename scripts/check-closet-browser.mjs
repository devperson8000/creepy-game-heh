import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1000,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true})));
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');await page.locator('#lobby-singleplayer').click();await page.waitForFunction(()=>!!window.monochrome);await page.evaluate(()=>{monochrome.renderer.setPixelRatio(.5);});await page.evaluate(()=>document.querySelector('.arrival-skip')?.click());await page.waitForFunction(()=>!monochrome.arrival.active);
 await page.evaluate(()=>{const g=monochrome,t=g.world.closets[0];g.player.x=t.exit.x;g.player.z=t.exit.z;g.player.height=0;g.input.setView(0,0);g.ui.hideScreen();g.renderer.domElement.focus();});
 await page.waitForFunction(()=>monochrome.ui.el('interaction-label').textContent==='Hide in closet');await page.keyboard.down('KeyE');await page.waitForFunction(()=>monochrome.run.hidden);await page.keyboard.up('KeyE');await page.locator('#hide-mask').waitFor({state:'visible'});
 assert.match(await page.locator('#hide-mask').evaluate(el=>getComputedStyle(el).backgroundImage),/repeating-linear-gradient/);
 assert.equal(await page.evaluate(()=>monochrome.world.closets[0].mesh.visible),false,'all front panels hide together so the interior view stays clear');
 await page.evaluate(()=>monochrome.input.setView(Math.PI,0));await page.screenshot({path:'work/remove-tests/closet-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'work/remove-tests/closet-phone.png'});
 await page.keyboard.down('KeyE');await page.waitForFunction(()=>!monochrome.run.hidden);await page.keyboard.up('KeyE');await page.locator('#hide-mask').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>monochrome.world.closets[0].mesh.visible),true);
 assert.deepEqual(errors,[]);console.log('PASS actual hold-E closet entry, multi-grille view, desktop/phone layout and exit restoring the complete front; no runtime errors');
}catch(error){console.error(error);console.log(errors);process.exitCode=1;}finally{await browser.close();}
