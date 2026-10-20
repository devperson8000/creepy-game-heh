import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const password=process.env.HALLOWEEN_TEST_PASSWORD||await readFile('work/halloween-preview-password.txt','utf8'),base=process.env.GAME_TEST_URL||'http://localhost:4173';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']}),context=await browser.newContext({viewport:{width:1000,height:800}}),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));await context.addInitScript(()=>{try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));}catch{}});
const host=await context.newPage(),guest=await context.newPage(),name='Halloween tests '+Date.now();let frame;
try{
 await host.goto(base);await host.click('#halloween-test-entry');await host.getByLabel('Password',{exact:true}).fill(password);await host.getByRole('button',{name:'Unlock tests'}).click();await host.getByRole('button',{name:'Play with friends',exact:true}).click();
 await host.frameLocator('#halloween-test-frame').locator('#lobby-player-name').waitFor({timeout:30000});frame=host.frames().find(f=>f!==host.mainFrame());
 await frame.fill('#lobby-player-name','Halloween host');await frame.fill('#lobby-create-name',name);await frame.click('#lobby-create');await frame.waitForSelector('.in-waiting-room',{timeout:30000});await frame.evaluate(()=>document.querySelector('#waiting-terminal-button').click());
 await guest.goto(base);await guest.click('#lobby-multiplayer');await guest.fill('#lobby-player-name','Halloween guest');
 const row=guest.locator('.lobby-list-row').filter({hasText:name});await row.getByRole('button',{name:'Enter lobby'}).click({timeout:30000});
 await frame.getByRole('button',{name:'Approve',exact:true}).click({timeout:30000});await guest.waitForSelector('.in-waiting-room',{timeout:30000});await guest.evaluate(()=>document.querySelector('#waiting-terminal-button').click());await guest.click('#lobby-ready');
 await frame.waitForFunction(()=>!document.querySelector('#lobby-start')?.disabled);await frame.click('#lobby-start');await Promise.all([frame,guest].map(p=>p.waitForFunction(()=>!!window.monochrome,null,{timeout:45000})));
 assert.equal(await frame.evaluate(()=>!!monochrome.run.halloween),true);assert.equal(await guest.evaluate(()=>!!monochrome.run.halloween),true);assert.equal(await guest.locator('#halloween-test-hub').count(),0);
 await host.getByRole('button',{name:'Back to tests',exact:true}).click();await host.getByRole('button',{name:'Halloween key reveal',exact:true}).waitFor();assert.equal(await host.locator('iframe').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS password-authorized production co-op host starts Halloween early; a normal guest inherits the same seasonal map; Back to tests closes the hosted session.');
}catch(e){console.error(e);console.log(await host.locator('.halloween-test-status').textContent({timeout:1000}).catch(()=>null));console.log(await guest.locator('#lobby-notice').textContent({timeout:1000}).catch(()=>null));throw e;}
finally{await guest.evaluate(()=>window.monochrome?.client.close()).catch(()=>{});await browser.close();}
