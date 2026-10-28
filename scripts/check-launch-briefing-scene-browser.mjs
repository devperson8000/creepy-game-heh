import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];await mkdir('work/launch-briefing-scene',{recursive:true});
try{
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['ultrawide',2560,1080]]){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
  await page.goto(`${process.env.GAME_TEST_URL||'http://localhost:5197'}/scripts/fixtures/launch-briefing-scene.html`);await page.waitForFunction(()=>window.filmReady);assert.equal(await page.evaluate(()=>film.sample(4).hostImported),true);
  for(const t of (process.env.BRIEFING_SCENE_FAST?[37]:[7,12,23,29,37,45,55,64,72,76,83,86,90,93])){await page.evaluate(t=>film.sample(t),t);if(!process.env.BRIEFING_SCENE_FAST)await page.screenshot({path:`work/launch-briefing-scene/${name}-${t}.png`});}
  await page.evaluate(()=>{film.dispose();film.dispose();});assert.equal(await page.locator('canvas').count(),0);await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:390,height:844}});
 await reduced.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await reduced.goto(`${process.env.GAME_TEST_URL||'http://localhost:5197'}/scripts/fixtures/launch-briefing-scene.html?reduced`);await reduced.waitForFunction(()=>window.filmReady);await reduced.evaluate(()=>film.sample(39));
 const first=await reduced.locator('canvas').screenshot();await reduced.evaluate(()=>film.sample(40));assert.deepEqual(await reduced.locator('canvas').screenshot(),first,'reduced motion holds the entire shot');await reduced.evaluate(()=>film.dispose());await reduced.close();
 const failed=await browser.newPage();await failed.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));await failed.route('**/hazmat-survivor.glb',route=>route.abort());
 await failed.goto(`${process.env.GAME_TEST_URL||'http://localhost:5197'}/scripts/fixtures/launch-briefing-scene.html`);await failed.waitForFunction(()=>window.filmReady);assert.equal(await failed.evaluate(()=>film.sample(37).shot),'friends');await failed.evaluate(()=>film.dispose());assert.equal(await failed.locator('canvas').count(),0);await failed.close();
 const missingHost=await browser.newPage();await missingHost.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));await missingHost.route('**/hooded-stranger.glb',route=>route.abort());
 await missingHost.goto(`${process.env.GAME_TEST_URL||'http://localhost:5197'}/scripts/fixtures/launch-briefing-scene.html`);await missingHost.waitForFunction(()=>window.filmReady);assert.equal(await missingHost.evaluate(()=>film.sample(7).hostImported),false,'the authored hooded fallback survives model failure');await missingHost.evaluate(()=>film.dispose());await missingHost.close();
 const lateHost=await browser.newPage();let pendingHost;await lateHost.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));await lateHost.route('**/hooded-stranger.glb',route=>{pendingHost=route;});
 await lateHost.goto(`${process.env.GAME_TEST_URL||'http://localhost:5197'}/scripts/fixtures/launch-briefing-scene.html`,{waitUntil:'commit'});await lateHost.waitForFunction(()=>!!window.film);await lateHost.evaluate(()=>film.dispose());
 while(!pendingHost)await new Promise(resolve=>setTimeout(resolve,10));await pendingHost.continue();await lateHost.waitForFunction(()=>window.filmReady);assert.equal(await lateHost.locator('canvas').count(),0,'a late narrator cannot reattach after close');await lateHost.close();
 const late=await browser.newPage();let pending;
 await late.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));await late.route('**/hazmat-survivor.glb',route=>{pending=route;});
 await late.goto(`${process.env.GAME_TEST_URL||'http://localhost:5197'}/scripts/fixtures/launch-briefing-scene.html`,{waitUntil:'commit'});await late.waitForFunction(()=>!!window.film);await late.evaluate(()=>film.dispose());
 while(!pending)await new Promise(resolve=>setTimeout(resolve,10));await pending.continue();await late.waitForFunction(()=>window.filmReady);assert.equal(await late.locator('canvas').count(),0,'a late model load cannot reattach the disposed scene');assert.equal(await late.evaluate(()=>film.sample(42)),null);await late.close();
 assert.deepEqual(errors,[]);console.log('PASS desktop/phone/ultrawide, reduced-motion stills, failed/late model loads and repeated disposal');
}finally{await browser.close();}
