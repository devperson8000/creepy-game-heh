import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('work/hunt-clock',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low'})));
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');
 await page.locator('#lobby-singleplayer').click();await page.waitForFunction(()=>!!window.monochrome);
 await page.evaluate(()=>{monochrome.renderer.setPixelRatio(.5);monochrome.renderer.setSize(innerWidth,innerHeight);});
 await page.locator('.arrival-skip').click();await page.waitForFunction(()=>!monochrome.arrival.active);
 await page.waitForSelector('#hunt-clock:not([hidden])',{timeout:15000});
 assert.match(await page.locator('#hunt-clock').innerText(),/3:0/);
 await page.evaluate(()=>{monochrome.run.boardsOpen=true;monochrome.run.huntElapsed=30;});
 await page.waitForFunction(()=>document.querySelector('#hunt-clock-time').textContent.startsWith('4:'));
 assert.equal(await page.evaluate(()=>monochrome.enemy().released),false);
 const hidden=await page.evaluate(()=>{const actors=[];monochrome.world.scene.traverse(o=>{if(o.userData.actor)actors.push(o);});return actors.every(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return true;return false;});});
 assert.equal(hidden,true,'all monster meshes are hidden until six');
 await page.screenshot({path:'work/hunt-clock/desktop-clock.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/hunt-clock/mobile-clock.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const overlap=await page.evaluate(()=>{const c=document.querySelector('#hunt-clock').getBoundingClientRect(),a=document.querySelector('.game-top-actions').getBoundingClientRect(),w=document.querySelector('.wordmark').getBoundingClientRect();return c.left<a.right&&c.right>a.left&&c.top<a.bottom&&c.bottom>a.top||c.left<w.right&&c.right>w.left&&c.top<w.bottom&&c.bottom>w.top;});
 assert.equal(overlap,false,'clock fits mobile without covering header controls');
 // Timing assertions keep the real loop and UI but remove software GPU load.
 await page.evaluate(()=>{monochrome.renderer.render=()=>{};});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>monochrome.ui.overlay==='pause');
 const paused=await page.evaluate(()=>monochrome.run.huntElapsed);await page.waitForTimeout(650);
 assert.equal(await page.evaluate(()=>monochrome.run.huntElapsed),paused,'solo pause freezes the clock');
 await page.locator('#screen-primary').click();await page.waitForFunction(()=>monochrome.ui.overlay===null);
 await page.evaluate(()=>{monochrome.run.huntElapsed=89.85;});
 await page.waitForSelector('#hunt-warning:not([hidden])',{timeout:15000});
 assert.equal(await page.locator('#hunt-clock').isVisible(),false);
 assert.equal(await page.evaluate(()=>monochrome.enemy().released),true);
 assert.match(await page.locator('#hunt-warning').innerText(),/6:00/);
 await page.screenshot({path:'work/hunt-clock/six-warning.png'});
 await page.waitForSelector('#hunt-warning[hidden]',{state:'attached',timeout:10000});
 assert.equal(await page.locator('#hunt-clock').isVisible(),false,'clock stays gone after the warning');
 const position=await page.evaluate(()=>({...monochrome.enemy().position}));await page.waitForTimeout(400);
 assert.notDeepEqual(await page.evaluate(()=>monochrome.enemy().position),position,'released monster moves');
 assert.deepEqual(errors,[]);console.log('PASS solo clock pacing, safe exploration, monster visibility, mobile framing, pause, 6:00 warning, permanent clock removal and hunt release');
}catch(error){console.error(error);console.log(errors);process.exitCode=1;}
finally{await browser.close();}
