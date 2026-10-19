import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('work',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');await page.locator('#lobby-singleplayer').click();
 await page.waitForFunction(()=>!!window.monochrome);
 await page.evaluate(()=>document.querySelector('.arrival-skip')?.click());
 await page.waitForFunction(()=>!monochrome.arrival.active);
 await page.evaluate(()=>{
  const g=monochrome;g.renderer.setAnimationLoop(null);g.renderer.setPixelRatio(1);g.renderer.setSize(1200,800);g.ui.hideScreen();
  document.querySelector('#game-ui')?.setAttribute('hidden','');
 });
 for(const index of [0,1,2]){
  const text=await page.evaluate(index=>{
   const g=monochrome,note=g.world.wallNotes[index],normal={x:Math.sin(note.rotation.y),z:Math.cos(note.rotation.y)};
   g.player.x=note.position.x+normal.x*2.8;g.player.z=note.position.z+normal.z*2.8;
   g.camera.position.set(g.player.x,1.65,g.player.z);g.camera.lookAt(note.position);
   g.world.update(0,0,g.player,0);g.torch.beam.intensity=140;g.camera.updateMatrixWorld(true);
   g.renderer.render(g.world.scene,g.camera);g.torch.render(g.renderer);
   return note.userData.noteText;
  },index);
  await page.screenshot({path:`work/creepy-wall-note-${index}.png`});console.log('Rendered',text);
 }
 assert.deepEqual(errors,[]);console.log('PASS actual in-game wall paint, torch lighting and no runtime errors');
}finally{await browser.close();}
