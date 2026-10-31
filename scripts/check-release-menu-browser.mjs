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
 assert.equal(await page.getByRole('button',{name:'Test Halloween Gameplay',exact:true}).count(),0);
 assert.equal(await page.locator('#halloween-test-hub').count(),0);
 assert.equal(await page.locator('#two-tab-test,.finale-ui').count(),0);
 assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('study-mode')||el.classList.contains('two-tab-mode')),false);
}
try{
 for(const query of ['', '?mode=study','?mode=coop-test','?mode=coop-test&role=guest&session=test-1234','?mode=finale']){await page.goto(base+'/'+query);await cleanMenu();console.log('Clean menu:',query||'/');}
 await page.goto(base+'/testhalloween/');await page.getByRole('dialog',{name:'Halloween test access'}).waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForURL(base+'/');await cleanMenu();
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#lobby-multiplayer').click();await page.locator('#lobby-back').waitFor();await page.locator('#lobby-back').click();await cleanMenu();
 await page.setViewportSize({width:1200,height:800});await page.locator('#lobby-singleplayer').click();await page.waitForFunction(()=>!!window.monochrome);await page.evaluate(()=>{monochrome.renderer.render=()=>{};});await page.locator('.arrival-skip').click();await page.waitForFunction(()=>!monochrome.arrival.active);
 assert.equal(await page.locator('#game-ui a[href*="mode="]').count(),0);
 await page.evaluate(()=>document.exitPointerLock?.());await page.waitForFunction(()=>monochrome.ui.overlay==='pause');await page.getByRole('button',{name:'Return to main menu',exact:true}).click();await cleanMenu();
 assert.deepEqual(errors,[]);console.log('PASS release menu has Singleplayer/Multiplayer and no public test buttons; all former test URLs show the normal menu; phone layout, multiplayer/back and solo/pause/return work without unrestricted tests or runtime errors');
}catch(error){console.log(await page.evaluate(()=>({url:location.href,overlay:window.monochrome?.ui.overlay,text:document.body.innerText})).catch(()=>null));console.error(error);console.log(errors);process.exitCode=1;}finally{await browser.close();}
