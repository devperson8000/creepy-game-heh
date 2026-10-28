import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[],base=process.env.GAME_TEST_URL||'http://localhost:4173';page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true})));
async function cleanMenu(){
 await page.locator('#lobby-singleplayer').waitFor();
 assert.equal(await page.locator('.lobby-mode-options > *').count(),2);
 assert.equal(await page.getByRole('link',{name:/study|test/i}).count(),0);
 assert.equal(await page.getByRole('button',{name:/test|preview/i}).count(),0);
 assert.equal(await page.locator('#two-tab-test,.finale-ui').count(),0);
 assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('study-mode')||el.classList.contains('two-tab-mode')),false);
}
async function checkCountdownLayout(){
 const layout=await page.evaluate(()=>{const card=document.querySelector('.halloween-countdown'),h=card.getBoundingClientRect(),buttons=document.querySelector('.lobby-mode-options').getBoundingClientRect();return {removed:!document.querySelector('.map-countdown'),width:h.width,font:parseFloat(getComputedStyle(card.querySelector('strong')).fontSize),overlap:h.left<buttons.right&&h.right>buttons.left&&h.top<buttons.bottom&&h.bottom>buttons.top,overflow:document.querySelector('#lobby-menu').scrollWidth>document.querySelector('#lobby-menu').clientWidth};});
 assert.equal(layout.removed,true,'finished map announcement must be removed');
 assert.equal(layout.overlap,false,'Halloween countdown must not cover mode buttons');
 assert.equal(layout.overflow,false,'Halloween countdown must fit the viewport width');
 assert.ok(layout.font>=30,'countdown digits remain prominent');
 if(page.viewportSize().width>=1280)assert.ok(layout.width>=500,'desktop countdown is enlarged');
}
try{
 for(const query of ['', '?mode=study','?mode=coop-test','?mode=coop-test&role=guest&session=test-1234','?mode=finale']){await page.goto(base+'/'+query);await cleanMenu();console.log('Clean menu:',query||'/');}
 for(const viewport of [{width:1280,height:900},{width:1200,height:800},{width:390,height:844}]){await page.setViewportSize(viewport);await checkCountdownLayout();console.log('Countdown cards fit:',viewport);}
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#lobby-multiplayer').click();await page.locator('#lobby-back').waitFor();await page.locator('#lobby-back').click();await cleanMenu();
 await page.setViewportSize({width:1200,height:800});await page.locator('#lobby-singleplayer').click();await page.waitForFunction(()=>!!window.monochrome);await page.evaluate(()=>{monochrome.renderer.render=()=>{};});await page.locator('.arrival-skip').click();await page.waitForFunction(()=>!monochrome.arrival.active);
 assert.equal(await page.locator('#game-ui a[href*="mode="]').count(),0);
 await page.evaluate(()=>document.exitPointerLock?.());await page.waitForFunction(()=>monochrome.ui.overlay==='pause');await page.getByRole('button',{name:'Return to main menu',exact:true}).click();await cleanMenu();
 assert.deepEqual(errors,[]);console.log('PASS release menu has only Singleplayer/Multiplayer; all former test URLs show the normal menu; phone layout, multiplayer/back and solo/pause/return work without test links or runtime errors');
}catch(error){console.log(await page.evaluate(()=>({url:location.href,overlay:window.monochrome?.ui.overlay,text:document.body.innerText})).catch(()=>null));console.error(error);console.log(errors);process.exitCode=1;}finally{await browser.close();}
