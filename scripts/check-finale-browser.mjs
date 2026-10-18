import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const origin=process.env.TEST_URL??'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});
 await page.locator('#lobby-test-finale').waitFor();
 for(let visit=0;visit<3;visit++){
  await page.locator('#lobby-test-finale').click();
  await page.waitForFunction(()=>!!window.monochromeFinalePreview?.active,{timeout:30000});
  for(const [at,expected] of [[1,'fade'],[8,'chase'],[15,'stairs'],[21,'dive'],[26,'doors'],[32,'ascent'],[37,'defeat'],[41,'silence'],[46,'daylight']]){
   const shot=await page.evaluate(t=>window.monochromeFinalePreview.active.sample(t).shot,at);
   assert.equal(shot,expected,`time ${at}`);
  }
  const title=await page.evaluate(()=>{const frame=window.monochromeFinalePreview.active.sample(50);return {title:document.querySelector('.finale-title')?.textContent,complete:frame.complete};});
  assert.equal(title.title,'TOGETHER.');
  assert.equal(title.complete,false);
  if(visit===0){
   await page.locator('.finale-tools select').selectOption('3');
   await page.waitForFunction(()=>window.monochromeFinalePreview?.active?.scene.players.size===3);
   await page.locator('.finale-tools select').selectOption('4');
   await page.waitForFunction(()=>window.monochromeFinalePreview?.active?.scene.players.size===4);
   assert.equal(await page.locator('.finale-preview-shell canvas').count(),1,'only one preview canvas');
  }
  await page.locator('.finale-tools button').first().click();
  const restarted=await page.evaluate(()=>window.monochromeFinalePreview.active.elapsed);
  assert.ok(restarted<1);
  if(visit===1){await page.keyboard.press('Escape');}
  else await page.locator('.finale-tools button').last().click();
  await page.locator('#lobby-test-finale').waitFor();
 }
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('Finale: all shots, titles, cast sizes, replay, Escape and menu cleanup passed.');
} finally {await browser.close();}
