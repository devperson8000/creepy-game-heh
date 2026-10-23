import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],voiceResponses=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/audio/opening/'))voiceResponses.push(r.status());});
await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',volume:0,reducedMotion:false})));
try{
 const releaseResponse=page.waitForResponse(r=>r.url().includes('/api/halloween-release'));
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:4173');const response=await releaseResponse,released=response.ok()&&(await response.json()).released;
 if(released){
  await page.locator('.opening-canvas').waitFor({timeout:20000});assert.equal(await page.locator('#lobby-singleplayer').count(),0);
  const bounds=await page.locator('.opening-skip').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=844);
  await page.keyboard.down('Space');await page.locator('.opening-sequence.is-title').waitFor({timeout:8000});await page.keyboard.up('Space');assert.equal(await page.locator('#lobby-singleplayer').count(),0);assert.equal(await page.locator('.opening-canvas').count(),0);
 }
 await page.locator('#lobby-singleplayer').waitFor({timeout:12000});assert.equal(await page.locator('.opening-sequence,.opening-canvas').count(),0);assert.equal(await page.locator('#lobby-multiplayer').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(voiceResponses.filter(s=>s===200).length,released?4:0);assert.deepEqual(errors,[]);
 console.log(released?'PASS live Halloween opening, voice assets, mobile hold-to-title and mode menu':'PASS live pre-Halloween direct mode menu; no cinematic, voice requests or mobile overflow');
}finally{await browser.close();}
