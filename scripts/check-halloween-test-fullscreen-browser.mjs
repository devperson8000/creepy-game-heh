import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const password=process.env.HALLOWEEN_TEST_PASSWORD||await readFile('work/halloween-preview-password.txt','utf8');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true})));
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');await page.getByRole('button',{name:'Test Halloween Gameplay',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Halloween test access'});await dialog.getByLabel('Password',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Unlock tests'}).click();await page.locator('#halloween-test-hub').waitFor();
 await page.getByRole('button',{name:'Monochrome II teaser',exact:true}).click();await page.locator('#halloween-test-frame').waitFor();
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click({timeout:5000});
 await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('halloween-test-player'));
 assert.equal(await page.getByRole('button',{name:'Exit fullscreen',exact:true}).getAttribute('aria-pressed'),'true');
 const height=await page.locator('.halloween-test-player').evaluate(n=>n.getBoundingClientRect().height);assert.ok(height>=790);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(await page.locator('#halloween-test-frame').count(),1,'Escape leaves the test playing');
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.waitForFunction(()=>document.fullscreenElement);
 const activeFrame=page.frames().find(f=>f!==page.mainFrame());await activeFrame.locator('.b2-mute').press('Escape');await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(await activeFrame.locator('.b2-overlay').count(),1,'Escape from the film exits fullscreen without closing the film');
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.waitForFunction(()=>document.fullscreenElement);await page.getByRole('button',{name:'Replay test',exact:true}).click();assert.ok(await page.evaluate(()=>document.fullscreenElement));
 await page.getByRole('button',{name:'Back to tests',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(await page.locator('iframe').count(),0);
 // Mobile/browser fallback when native fullscreen is unavailable.
 await page.evaluate(()=>{Element.prototype.requestFullscreen=undefined;});await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Halloween key reveal',exact:true}).click();await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.locator('.halloween-test-player.is-expanded').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();assert.equal(await page.locator('.halloween-test-player.is-expanded').count(),0);await page.getByRole('button',{name:'Back to tests',exact:true}).click();assert.deepEqual(errors,[]);
 console.log('PASS fullscreen entry, label, resize, Escape, replay persistence, back cleanup and mobile fallback without overflow.');
}finally{await browser.close();}
