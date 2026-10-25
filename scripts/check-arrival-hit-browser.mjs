import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:false,volume:.5}));window.titleHits=[];window.titleCuts=[];
 const original=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const source=original.call(this),start=source.start;source.start=function(...args){if(source.buffer?.duration>4.13&&source.buffer?.duration<4.15)titleHits.push({at:performance.now(),offset:args[1],clock:args[0]});return start.apply(this,args);};return source;};
 const observer=new MutationObserver(()=>{const title=document.querySelector('#arrival');if(title?.style.getPropertyValue('--arrival-title')==='1'&&!titleCuts.length)titleCuts.push(performance.now());});document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['style']}));
});
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5183');await page.locator('#lobby-singleplayer').click();
 await page.waitForFunction(()=>titleCuts.length===1&&titleHits.length===1,null,{timeout:30000});
 const hit=await page.evaluate(()=>({hits:titleHits,cuts:titleCuts,opacity:getComputedStyle(document.querySelector('.arrival-title')).opacity}));
 assert.equal(hit.opacity,'1');assert.ok(Math.abs(hit.hits[0].at-hit.cuts[0])<20,'sound start and instant title occur in the same rendered update');assert.ok(hit.hits[0].offset>.037&&hit.hits[0].offset<.04,'skip the uploaded WAV leading silence');
 await mkdir('work/arrival-sound',{recursive:true});await page.screenshot({path:'work/arrival-sound/title-hit.png'});
 await page.keyboard.press('Space');await page.waitForSelector('#arrival',{state:'detached'});assert.equal(await page.evaluate(()=>titleHits.length),1);assert.deepEqual(errors,[]);
 console.log('PASS instant title, one synchronized decoded hit, leading-silence removal and skip cleanup',hit);
}finally{await browser.close();}
