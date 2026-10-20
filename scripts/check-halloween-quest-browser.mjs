import {B2_DURATION} from '../src/halloween-state.js';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:900,height:650}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true})));
try{
 await page.goto((process.env.GAME_TEST_URL||'http://localhost:5173')+'/?halloween=preview');await page.click('#lobby-singleplayer');await page.waitForFunction(()=>!!window.monochrome);
 await page.evaluate(()=>{const g=monochrome;g.renderer.render=()=>{};document.querySelector('.arrival-skip')?.click();});await page.waitForFunction(()=>!monochrome.arrival.active);
 await page.evaluate(()=>{const g=monochrome,update=g.world.update;g.world.update=(...args)=>{update(...args);g.world.scene.updateMatrixWorld(true);};g.run.boardsOpen=true;g.ui.hideScreen();});
 for(const [stage,id] of ['invitation','seal-0','seal-1','seal-2','chest','b2-panel'].entries()){
  await page.keyboard.up('KeyE');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.evaluate(id=>{const g=monochrome,t=g.world.targets.get('halloween:'+id),at=t.mesh.getWorldPosition(g.camera.position.clone()),upstairs=id==='chest'||id==='b2-panel';Object.assign(g.player,{x:at.x,z:at.z+1.2,height:upstairs?3.6:0});g.input.setView(0,Math.atan2(at.y-(g.player.height+1.65),1.2));g.ui.hideScreen();g.renderer.domElement.focus();},id);
  await page.waitForFunction(()=>!monochrome.ui.el('interaction').hidden&&/invitation|seal|Unseal|Turn the Halloween/i.test(monochrome.ui.el('interaction-label').textContent),null,{timeout:4000});
  await page.keyboard.down('KeyE');
  if(stage<5)await page.waitForFunction(stage=>monochrome.run.halloween.stage===stage+1,stage,{timeout:4000});else await page.waitForFunction(()=>monochrome.run.phase==='halloween');
 }
 await page.keyboard.up('KeyE');assert.equal(await page.evaluate(()=>monochrome.run.banked.size),0);
 const hunt=await page.evaluate(()=>{monochrome.run.halloween.visit.startedAt-=6;return monochrome.run.huntElapsed;});await page.waitForFunction(()=>monochrome.run.halloween.visit?.stage==='archive');
 assert.equal(await page.evaluate(()=>monochrome.run.huntElapsed),hunt);
 await page.evaluate(()=>{monochrome.renderer.domElement.focus();});await page.keyboard.down('KeyW');await page.waitForFunction(()=>monochrome.run.halloween.visit.stage==='conversation',null,{timeout:5000});await page.keyboard.up('KeyW');
 await page.evaluate(duration=>monochrome.run.halloween.visit.startedAt-=duration,B2_DURATION.conversation+1);await page.waitForFunction(()=>monochrome.run.halloween.seen);
 assert.equal(await page.evaluate(()=>localStorage.getItem('monochrome.recovered-footage.2026')),'1');
 await page.evaluate(()=>{Object.assign(monochrome.player,{x:0,z:3.2});monochrome.renderer.domElement.focus();});await page.waitForFunction(()=>!document.querySelector('.b2-return').disabled);await page.click('.b2-return');await page.waitForFunction(()=>monochrome.run.halloween.visit.stage==='return');
 await page.evaluate(()=>monochrome.run.halloween.visit.startedAt-=5);await page.waitForFunction(()=>monochrome.run.phase==='playing');assert.equal(await page.evaluate(()=>monochrome.player.height),3.6);
 assert.deepEqual(errors,[]);console.log('PASS actual E holds complete the optional quest; free walking triggers B2 conversation; hunt freezes, footage is earned, and the elevator returns to B1.');
}catch(e){console.log(await page.evaluate(()=>({phase:monochrome?.run.phase,q:monochrome?.run.halloween,pos:monochrome?.player,label:monochrome?.ui.el('interaction-label').textContent,overlay:monochrome?.ui.overlay})));throw e;}finally{await browser.close();}
