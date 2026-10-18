import {chromium} from 'playwright';
const origin=process.env.TEST_URL??'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 await page.locator('#lobby-test-finale').waitFor();
 await page.locator('#lobby-test-finale').click();
 await page.locator('.finale-tools button').first().waitFor({timeout:30000});
 const output=await page.evaluate(()=>window.monochromeFinalePreview?.active?.sample(50));
 // The same scene must remain functional after seeking and replay.
 await page.locator('.finale-tools button').first().click();
 await page.locator('.finale-tools button').last().click();
 await page.locator('#lobby-test-finale').waitFor();
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('Finale preview opens, replays and returns to the menu.');
} finally {await browser.close();}
