import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true})));
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');await page.locator('#lobby-singleplayer').click();await page.waitForFunction(()=>!!window.monochrome);
 await page.evaluate(()=>{monochrome.renderer.render=()=>{};document.querySelector('.arrival-skip')?.click();});await page.waitForFunction(()=>!monochrome.arrival.active);
 await page.evaluate(()=>{const g=monochrome,update=g.world.update;g.world.update=(...args)=>{update(...args);g.world.scene.updateMatrixWorld(true);};g.ui.hideScreen();g.renderer.domElement.focus();g.run.boardsOpen=true;});
 for(let cabinet=0;cabinet<12;cabinet++)for(const row of [2,1,0]){
  const id=cabinet*3+row;
  await page.evaluate(id=>{const g=monochrome,t=g.world.targets.get(`drawer-${id}`),at=t.mesh.getWorldPosition(g.camera.position.clone());g.player.x=at.x;g.player.z=at.z+1.3;g.input.setView(0,Math.atan2(at.y-1.65,1.3));g.ui.hideScreen();g.renderer.domElement.focus();},id);
  try{await page.waitForFunction(()=>monochrome.ui.el('interaction-label').textContent==='Search drawer',null,{timeout:3000});}catch(e){console.log('Prompt failed',id,await page.evaluate(()=>({label:monochrome.ui.el('interaction-label').textContent,overlay:monochrome.ui.overlay,pos:monochrome.player,opened:monochrome.run.drawers.filter(d=>d.opened).map(d=>d.id)})));throw e;}
  await page.keyboard.down('KeyE');
  try{await page.waitForFunction(id=>monochrome.run.drawers[id].opened,id,{timeout:3000});}catch(e){console.log('Failed drawer',id,await page.evaluate(()=>({text:monochrome.ui.el('interaction-label').textContent,opened:monochrome.run.drawers.filter(d=>d.opened).map(d=>d.id)})));throw e;}finally{await page.keyboard.up('KeyE');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
 }
 assert.deepEqual(errors,[]);console.log('PASS all 36 real solo drawers open with actual E holds, top-to-bottom with adjacent drawers left open');
}finally{await browser.close();}
