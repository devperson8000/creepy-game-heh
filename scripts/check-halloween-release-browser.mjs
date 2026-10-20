import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {HALLOWEEN_DEADLINE,releaseStatus} from '../src/halloween-release-time.js';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:900,height:650}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));let now=HALLOWEEN_DEADLINE-60000;
await page.route('**/api/halloween-release',route=>route.fulfill({json:releaseStatus(now)}));
await page.addInitScript(()=>{Date.now=()=>Date.parse('2035-01-01');});
try{
 for(const released of [false,true]){
  now=released?HALLOWEEN_DEADLINE:HALLOWEEN_DEADLINE-60000;
  await page.goto((process.env.GAME_TEST_URL||'http://localhost:4173')+'/?halloween=preview');
  await page.waitForSelector('#lobby-singleplayer');
  assert.equal(await page.getByRole('button',{name:/test animation|test finale|creature study/i}).count(),0);
  await page.click('#lobby-singleplayer');await page.waitForFunction(()=>!!window.monochrome);
  assert.equal(await page.evaluate(()=>!!monochrome.run.halloween),released,'only the trusted server clock may enable a production run');
  assert.equal(await page.evaluate(()=>!!monochrome.world.halloween),released);
 }
 assert.deepEqual(errors,[]);console.log('PASS production bundle: future device clock and preview query cannot unlock Halloween; exact trusted deadline enables its map/quest; no public test options.');
}finally{await browser.close();}
