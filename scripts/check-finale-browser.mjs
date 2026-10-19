import {FINALE_DURATION} from '../src/finale-state.js';
import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');await page.getByRole('button',{name:'Test finale animation',exact:true}).click();await page.waitForFunction(()=>window.monochromeFinale?.ready);
 const started=Date.now();await page.waitForFunction(duration=>monochromeFinale.time>=duration,FINALE_DURATION,{timeout:60000});assert.ok(Date.now()-started>=(FINALE_DURATION-4)*1000);await page.getByText('TOGETHER.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Replay',exact:true}).evaluate(el=>{el.click();return window.monochromeFinale.time;}),0);
 for(const count of ['3','4','2']){await page.getByLabel('Preview survivors').selectOption(count);await page.waitForFunction(n=>monochromeFinale.castCount===Number(n)&&monochromeFinale.time<10,count);}
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Mute finale',exact:true}).click();assert.equal(await page.evaluate(()=>monochromeFinale.audio.muted),true);
 await page.keyboard.press('Escape');await page.locator('#lobby-singleplayer').waitFor();
 for(let i=0;i<2;i++){await page.getByRole('button',{name:'Test finale animation',exact:true}).click();await page.waitForFunction(()=>monochromeFinale?.ready);await page.getByRole('button',{name:'Back to menu',exact:true}).click();await page.locator('#lobby-singleplayer').waitFor();}
 await page.route('**/models/hazmat-survivor.glb',route=>route.abort());await page.reload();await page.getByRole('button',{name:'Test finale animation',exact:true}).click();await page.getByRole('alert').getByText('The finale could not load.').waitFor();await page.unroute('**/models/hazmat-survivor.glb');await page.getByRole('button',{name:'Try again',exact:true}).click();await page.waitForFunction(()=>window.monochromeFinale?.ready);await page.getByRole('button',{name:'Back to menu',exact:true}).click();
 assert.equal(await page.locator('.finale-ui').count(),0);assert.equal(await page.locator('#scene canvas').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS full 27s finale, title, replay, 2/3/4 cast, mute, mobile layout, Escape, repeated preview/menu cleanup; no browser errors');
}catch(e){console.error(e);console.log(errors);process.exitCode=1;}finally{await browser.close();}
