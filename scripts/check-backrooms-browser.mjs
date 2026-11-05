import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('work/backrooms',{recursive:true});
const base=(process.env.GAME_TEST_URL||'http://localhost:5173').replace(/\/$/,'')+'/backrooms';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1024,height:640}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base);await page.waitForFunction(()=>!!window.backrooms);await page.screenshot({path:'work/backrooms/menu.png'});
 await page.locator('[data-action="start"]').click();await page.waitForTimeout(500);
 const before=await page.evaluate(()=>({...window.backrooms.player}));await page.keyboard.down('KeyW');await page.waitForFunction(p=>Math.hypot(window.backrooms.player.x-p.x,window.backrooms.player.z-p.z)>.4,before,{timeout:30000});await page.keyboard.up('KeyW');
 const after=await page.evaluate(()=>({...window.backrooms.player}));console.log({before,after,paused:await page.evaluate(()=>window.backrooms.paused),focus:await page.evaluate(()=>document.activeElement.tagName)});assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.4,'actual keyboard movement');
 await page.screenshot({path:'work/backrooms/arrival.png'});
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.backrooms.paused),true);const frozen=await page.evaluate(()=>window.backrooms.player.x);await page.keyboard.down('KeyW');await page.waitForTimeout(150);await page.keyboard.up('KeyW');assert.equal(await page.evaluate(()=>window.backrooms.player.x),frozen);
 await page.locator('[data-action="vhs"]').click();assert.equal(await page.evaluate(()=>window.backrooms.vhs),false);await page.locator('[data-action="start"]').click();await page.screenshot({path:'work/backrooms/clean.png'});
 await page.evaluate(()=>{window.backrooms.player.x=18;window.backrooms.player.z=6;});await page.waitForTimeout(200);await page.screenshot({path:'work/backrooms/column-hall.png'});
 await page.evaluate(()=>window.backrooms.dispose());assert.equal(await page.locator('#scene canvas').count(),0);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base);await mobile.waitForFunction(()=>!!window.backrooms);await mobile.screenshot({path:'work/backrooms/mobile-menu.png'});await mobile.locator('[data-action="start"]').click();await mobile.screenshot({path:'work/backrooms/mobile.png'});assert.equal(await mobile.locator('.br-touch').isVisible(),true);
 const touchBefore=await mobile.evaluate(()=>({...window.backrooms.player}));const forward=mobile.locator('[data-key="KeyW"]'),rect=await forward.boundingBox();await mobile.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await mobile.mouse.down();await mobile.waitForFunction(p=>Math.hypot(window.backrooms.player.x-p.x,window.backrooms.player.z-p.z)>.2,touchBefore);await mobile.mouse.up();
 await mobile.locator('[data-action="pause"]').click();assert.equal(await mobile.evaluate(()=>window.backrooms.paused),true);await mobile.locator('[data-action="sound"]').click();assert.equal(await mobile.locator('[data-action="sound"]').getAttribute('aria-pressed'),'false');
 
 assert.deepEqual(errors,[]);console.log('PASS: WebGL/shaders, keyboard movement, pause, VHS toggle, mobile/reduced motion, disposal.');
}finally{await browser.close();}
