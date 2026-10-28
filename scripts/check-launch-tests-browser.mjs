import {chromium} from 'playwright';import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://localhost:5198',password=process.env.HALLOWEEN_TEST_PASSWORD;if(!password)throw new Error('Set HALLOWEEN_TEST_PASSWORD for the authorized test hub.');const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 if(!base.startsWith('https://')){await page.route('**/api/halloween-preview',async r=>r.fulfill({json:{authorized:r.request().postDataJSON()?.password===password}}));await page.route('**/api/halloween-release',r=>r.fulfill({json:{version:'halloween-2026',releaseAt:Date.parse('2026-10-31T05:00:00Z'),serverNow:Date.parse('2026-10-28T12:00:00Z'),released:false}}));}
 await page.goto(`${base}/testhalloween`);await page.locator('input[name=password]').fill(password);await page.locator('button[type=submit]').click();
 await page.locator('#halloween-test-hub').waitFor();
 await page.getByRole('button',{name:'Countdown launch sequence',exact:true}).click();const frame=page.frameLocator('#halloween-test-frame');
 await frame.locator('#halloween-timer-view').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.fullscreenElement),null,'a timer preview must not automatically cover the test controls');await page.getByRole('button',{name:'Last 10 seconds',exact:true}).click();
 await frame.locator('[data-launch-briefing]').waitFor({state:'visible',timeout:25000});
 assert.equal(await frame.locator('.halloween-timer-footer').isVisible(),true);await page.locator('.test-back').click();assert.equal(await page.locator('#halloween-test-frame').count(),0);
 await page.getByRole('button',{name:'Stranger launch briefing',exact:true}).click();await frame.locator('[data-launch-briefing]').waitFor({state:'visible'});await frame.locator('.launch-briefing-loading').waitFor({state:'hidden',timeout:20000});
 await page.getByRole('button',{name:'Static / music ending',exact:true}).click();await frame.locator('[data-launch-briefing][data-phase=static]').waitFor({timeout:12000});
 await page.getByRole('button',{name:'Music / titles',exact:true}).click();await frame.locator('[data-word-count="3"]').waitFor({timeout:25000});await frame.locator('[data-briefing-proceed]').waitFor({state:'visible'});
 await page.locator('.test-replay').click();await frame.locator('[data-launch-briefing][data-phase=briefing]').waitFor();await page.locator('.test-back').click();assert.deepEqual(errors,[]);console.log('PASS private password gate, ending countdown→same film, direct briefing, static/music/titles, replay and back cleanup');
}finally{await browser.close()}
