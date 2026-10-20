import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('work',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],base=process.env.GAME_TEST_URL||'http://localhost:5173';
page.on('pageerror',error=>errors.push(error.message));
await page.clock.install({time:new Date('2026-10-20T04:00:00Z')});
await page.clock.pauseAt(new Date('2026-10-20T05:00:00Z'));
let serverNow=Date.parse('2026-10-20T05:00:00Z');
await page.route('**/api/halloween-release',route=>route.fulfill({json:{version:'halloween-2026',releaseAt:Date.parse('2026-10-31T05:00:00Z'),serverNow}}));
try{
 await page.goto(base);await page.locator('.halloween-countdown').waitFor();
 assert.deepEqual(await page.locator('[data-countdown]').allTextContents(),['11','00','00','00']);
 await page.clock.runFor(1000);assert.equal(await page.locator('[data-countdown="seconds"]').innerText(),'59');
 await page.screenshot({path:'work/halloween-desktop.png'});
 for(const width of [1100,768,390,320]){
  await page.setViewportSize({width,height:844});
  assert.equal(await page.locator('#lobby-menu').evaluate(el=>el.scrollWidth>el.clientWidth),false,`menu overflows at ${width}`);
  const overlap=await page.evaluate(()=>{const a=document.querySelector('.halloween-countdown').getBoundingClientRect(),b=document.querySelector('.lobby-mode-options').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;});
  assert.equal(overlap,false,`countdown overlaps mode buttons at ${width}`);
  await page.locator('.halloween-countdown').scrollIntoViewIfNeeded();
  if(width===390)await page.screenshot({path:'work/halloween-mobile.png'});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.halloween-bat').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.locator('#lobby-multiplayer').click();await page.locator('#lobby-back').waitFor();
 assert.equal(await page.locator('.halloween-countdown').count(),0);
 await page.locator('#lobby-back').click();assert.equal(await page.locator('.halloween-countdown').count(),1);
 await page.clock.setSystemTime(new Date('2026-10-31T05:00:00Z'));await page.clock.runFor(1000);
 assert.equal(await page.locator('.halloween-countdown.is-complete').count(),0,'client wall clock cannot release the update');
 serverNow=Date.parse('2026-10-31T05:00:00Z');await page.evaluate(async()=>{const {halloweenRelease}=await import('/src/halloween-release.js');await halloweenRelease.refresh();});await page.clock.runFor(1000);
 await page.waitForSelector('.halloween-countdown.is-complete');
 assert.equal(await page.locator('.halloween-clock').isVisible(),false);assert.equal(await page.locator('.halloween-arrived').innerText(),'The archive is waiting. Enter a new run.');
 await page.clock.fastForward(60000);assert.equal(await page.locator('.halloween-countdown.is-complete').count(),1);
 await page.locator('#lobby-singleplayer').click();await page.waitForFunction(()=>!!window.monochrome);
 assert.equal(await page.locator('.halloween-countdown').count(),0);assert.equal(await page.evaluate(()=>!!monochrome.run.halloween),true);
 assert.deepEqual(errors,[]);console.log('PASS fixed Sydney deadline, live tick, desktop/mobile layouts, reduced motion, multiplayer/back lifecycle, expiry and solo start; no runtime errors');
}finally{await browser.close();}
