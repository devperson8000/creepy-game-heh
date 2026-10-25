import {chromium} from 'playwright';
import assert from 'node:assert/strict';
let password='';for await(const part of process.stdin){password+=part;if(password.includes('\n'))break;}password=password.trim();assert.ok(password);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);
await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true,volume:0})));
try{
 await page.goto(process.env.GAME_TEST_URL||'https://creepy-game-heh.vercel.app/testhalloween');
 const dialog=page.getByRole('dialog',{name:'Halloween test access'});await dialog.waitFor();
 await dialog.getByLabel('Password',{exact:true}).fill('incorrect-password');await dialog.getByRole('button',{name:'Unlock tests'}).click();await page.getByRole('alert').filter({hasText:'Incorrect password'}).waitFor();assert.equal(await page.locator('#halloween-test-hub').count(),0);
 await dialog.getByLabel('Password',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Unlock tests'}).click();await page.locator('#halloween-test-hub').waitFor();
 const breaths=Promise.all(['needle-breath.mp3','needle-breath-heavy.mp3'].map(name=>page.waitForResponse(r=>r.url().endsWith('/sfx/'+name)&&r.status()===200)));
 const modelLoaded=page.waitForResponse(r=>r.url().endsWith('/models/teaser/needlelimbs.glb')&&r.status()===200);
 await page.getByRole('button',{name:'Monochrome II teaser',exact:true}).click();await modelLoaded;await breaths;
 const frame=page.frames().find(f=>f!==page.mainFrame());await frame.locator('.round-loading').waitFor({state:'detached'});await frame.locator('.b2-overlay:not([hidden])').waitFor();assert.equal(await frame.locator('.replay-preview-note').isVisible(),false);
 await page.getByRole('button',{name:'Back to tests',exact:true}).click();assert.equal(await page.locator('iframe').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS live route, password rejection/acceptance, textured Needlelimbs teaser and both update breath clips loading, and clean return.');
}finally{await browser.close();}
