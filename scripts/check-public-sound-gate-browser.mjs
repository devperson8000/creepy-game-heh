import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage(),requests=[],errors=[];
page.on('request',r=>{if(r.url().includes('/audio/halloween/sfx/')||r.url().includes('/audio/launch/'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true,volume:0})));
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5183');await page.locator('#lobby-singleplayer').click();await page.waitForFunction(()=>!!window.monochrome);await page.keyboard.press('Space');await page.waitForSelector('#arrival',{state:'detached'});
 const state=await page.evaluate(()=>({seasonal:!!monochrome.run.halloween,mapUpdate:monochrome.run.mapUpdate,size:monochrome.run.layout.size}));assert.equal(state.seasonal,false);assert.equal(state.mapUpdate,true);assert.equal(state.size,45);await page.waitForTimeout(1500);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 console.log('PASS main still serves the balanced plain map and never requests update-only sounds',state);
}finally{await browser.close();}
