import {chromium} from 'playwright';import assert from 'node:assert/strict';
const password=process.env.HALLOWEEN_TEST_PASSWORD;if(!password)throw new Error('Set HALLOWEEN_TEST_PASSWORD.');
const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),p=await b.newPage();let release;
try{
 await p.route('**/api/halloween-preview',async r=>{if(r.request().frame().parentFrame())await new Promise(resolve=>{release=resolve});await r.fulfill({json:{authorized:r.request().postDataJSON()?.password===password}}).catch(()=>{});});
 await p.route('**/api/halloween-release',r=>r.fulfill({json:{version:'halloween-2026',releaseAt:Date.parse('2026-10-31T05:00:00Z'),serverNow:Date.parse('2026-10-28T12:00:00Z'),released:false}}));
 await p.goto('http://localhost:5198/testhalloween');await p.locator('[name=password]').fill(password);await p.locator('[type=submit]').click();await p.getByRole('button',{name:'Stranger launch briefing',exact:true}).click();const command=p.getByRole('button',{name:'Monochrome buildup',exact:true});await command.waitFor();assert.equal(await command.isDisabled(),true,'shortcut must not accept input before authorized preview is ready');
 while(!release)await new Promise(r=>setTimeout(r,10));release();await command.click();const frame=p.frameLocator('#halloween-test-frame');await frame.locator('[data-monochrome-beat=stationary]').waitFor({timeout:15000});await frame.getByText("What's that?",{exact:true}).waitFor();await frame.locator('[data-monochrome-beat=sprint]').waitFor();await p.locator('.test-back').click();console.log('PASS delayed authorization/readiness cannot lose launch shortcuts; stationary→question→charge works');
}finally{release?.();await b.close()}
