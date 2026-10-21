import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFile,mkdir} from 'node:fs/promises';
const password=process.env.HALLOWEEN_TEST_PASSWORD||await readFile('work/halloween-preview-password.txt','utf8');
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));window.teaserRequests=[];const fetch=window.fetch;window.fetch=(url,...args)=>{teaserRequests.push(String(url));return fetch(url,...args);};});
const frame=()=>page.frames().find(f=>f!==page.mainFrame());
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');await page.getByRole('button',{name:'Test Halloween Gameplay',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Halloween test access'});await dialog.getByLabel('Password',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Unlock tests'}).click();
 await page.locator('#halloween-test-hub').waitFor();await page.getByRole('button',{name:'Monochrome II teaser',exact:true}).click();await page.locator('#halloween-test-frame').waitFor();
 await frame().locator('.replay-preview-note').waitFor({timeout:30000});assert.match(await frame().locator('.replay-preview-note').textContent(),/Needlelimbs.*missing/i);
 await frame().locator('.b2-subtitle').filter({hasText:'You made it out?'}).waitFor({timeout:10000});
 const started=Date.now();await frame().locator('.b2-subtitle').filter({hasText:'I don’t think it was just Monochrome'}).waitFor({timeout:10000});
 const requests=await frame().evaluate(()=>teaserRequests);assert.ok(requests.some(url=>url.includes('survivor-reply-v2.mp3')));assert.ok(requests.some(url=>url.includes('radio-out-v2.mp3')));assert.equal(requests.some(url=>/models\/teaser\/(sonask|crawler|maw|needlelimbs)\.glb/.test(url)),false,'missing selected model is explicit; no substitute or missing-file request');
 const remaining=Math.max(0,9500-(Date.now()-started));await page.waitForTimeout(remaining);await mkdir('work/updated-teaser',{recursive:true});
 console.log('Before reveal capture',Date.now()-started,await frame().locator('.replay-preview-note').isVisible());
 const bounds=await page.locator('#halloween-test-frame').boundingBox();await page.screenshot({clip:bounds,path:'work/updated-teaser/mechanical-reveal.png',animations:'disabled',timeout:5000});
 console.log('After reveal capture',Date.now()-started);assert.equal(await frame().locator('.replay-preview-note').isVisible(),true,'capture must occur during the new film rather than after teardown');
 await frame().locator('.b2-overlay').waitFor({state:'detached',timeout:12000});
 await page.getByRole('button',{name:'Replay test',exact:true}).click();await frame().locator('.replay-preview-note').waitFor({timeout:30000});
 await page.getByRole('button',{name:'Back to tests',exact:true}).click();assert.equal(await page.locator('iframe').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS private updated teaser: new dialogue, explicit missing-model notice, no legacy creatures/substitutes, full film playback, mechanical reveal capture, replay and teardown.');
}finally{await browser.close();}
