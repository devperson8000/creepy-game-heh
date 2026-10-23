import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {HALLOWEEN_DEADLINE,releaseStatus} from '../src/halloween-release-time.js';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:900,height:650}}),errors=[],voices=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/audio/opening/'))voices.push(r.url());});
await page.addInitScript(()=>{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',volume:0}));Date.now=()=>Date.parse('2035-01-01');});
let state='before';await page.route('**/api/halloween-release',route=>state==='offline'?route.abort():route.fulfill({json:releaseStatus(state==='before'?HALLOWEEN_DEADLINE-86400000:HALLOWEEN_DEADLINE)}));
const base=process.env.GAME_TEST_URL||'http://localhost:5173';
async function normalMenu(){await page.locator('#lobby-singleplayer').waitFor({timeout:8000});assert.equal(await page.locator('.opening-sequence,.opening-canvas').count(),0);assert.equal(voices.length,0);}
try{
 await page.goto(base);await normalMenu();console.log('PASS before Halloween: direct menu, no opening/audio, visitor date cannot unlock it');
 state='offline';await page.reload();await normalMenu();console.log('PASS unavailable release signal leaves opening postponed');
 state='released';await page.reload();await page.locator('.opening-canvas').waitFor({timeout:15000});assert.equal(await page.locator('#lobby-singleplayer').count(),0);
 await page.keyboard.down('Space');await page.locator('.is-title').waitFor({timeout:5000});await page.keyboard.up('Space');await page.locator('#lobby-singleplayer').waitFor({timeout:12000});assert.equal(voices.length,4);assert.deepEqual(errors,[]);
 console.log('PASS Halloween deadline: opening and four voice files unlock; hold-to-title and menu still work');
}finally{await browser.close();}
