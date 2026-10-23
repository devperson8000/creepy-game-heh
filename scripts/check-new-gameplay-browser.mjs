import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFile,mkdir} from 'node:fs/promises';
const password=await readFile('work/halloween-preview-password.txt','utf8'),base=process.env.GAME_TEST_URL||'http://localhost:5173';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1150,height:760}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true,volume:0})));
try{
 await page.goto(base);await page.locator('#lobby-singleplayer').waitFor();assert.equal(await page.getByRole('button',{name:'Test Halloween Gameplay',exact:true}).count(),0);
 await page.goto(base+'/testhalloween');const dialog=page.getByRole('dialog',{name:'Halloween test access'});await dialog.waitFor();assert.equal(await page.locator('#halloween-test-hub').count(),0);
 await dialog.getByLabel('Password',{exact:true}).fill('incorrect');await dialog.getByRole('button',{name:'Unlock tests'}).click();await page.getByText('Incorrect password. Try again.',{exact:true}).waitFor();assert.equal(await page.locator('#halloween-test-hub').count(),0);
 await dialog.getByLabel('Password',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Unlock tests'}).click();await page.getByRole('button',{name:'Test new gameplay',exact:true}).click();
 const frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>!!window.monochrome,{timeout:30000});await frame.waitForFunction(()=>!monochrome.ui.overlay,{timeout:30000});
 const details=await frame.evaluate(()=>({size:monochrome.run.layout.size,drawers:monochrome.run.drawers.length,rooms:monochrome.run.layout.rooms.length,height:monochrome.player.height,grilles:monochrome.world.closets.every(c=>c.physicalGrille)}));assert.ok(details.size>=55);assert.equal(details.drawers,details.rooms);assert.equal(details.height,-7.2);assert.equal(details.grilles,true);
 await frame.locator('#stamina').waitFor();await page.getByRole('button',{name:'Next drawer room',exact:true}).click();await frame.waitForTimeout(300);
 await frame.getByText('Search drawer',{exact:true}).waitFor();await frame.locator('canvas').first().click({position:{x:750,y:200}});assert.equal(await frame.evaluate(()=>!!document.pointerLockElement),false);await page.keyboard.down('e');await frame.waitForFunction(()=>monochrome.run.drawers.some(d=>d.opened));await page.keyboard.up('e');
 await mkdir('work/new-gameplay',{recursive:true});await page.screenshot({path:'work/new-gameplay/drawer-room.png',timeout:10000});
 await page.getByRole('button',{name:'Corridor closet',exact:true}).click();await frame.waitForTimeout(300);await page.screenshot({path:'work/new-gameplay/corridor-closet.png',timeout:10000});
 await frame.getByText('Hide in closet',{exact:true}).waitFor();await frame.locator('canvas').first().focus();await page.keyboard.down('e');await frame.waitForFunction(()=>monochrome.run.hidden);await page.keyboard.up('e');
 const before=await frame.evaluate(()=>{const g=monochrome,c=g.world.closets.find(c=>Math.hypot(c.hide.x-g.player.x,c.hide.z-g.player.z)<.01);return {x:g.player.x,z:g.player.z,matrix:c.mesh.matrixWorld.elements.slice(),id:c.id};});
 assert.equal(await frame.locator('#hide-mask').isVisible(),false,'grille is not a fixed screen overlay');
 await frame.evaluate(()=>monochrome.input.setView(monochrome.input.yaw+.35,.1));await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');
 const after=await frame.evaluate(id=>({x:monochrome.player.x,z:monochrome.player.z,matrix:monochrome.world.targets.get(id).mesh.matrixWorld.elements.slice()}),before.id);assert.equal(after.x,before.x);assert.equal(after.z,before.z);assert.deepEqual(after.matrix,before.matrix);
 await page.screenshot({path:'work/new-gameplay/inside-closet.png',timeout:10000});
 await page.keyboard.down('e');await frame.waitForFunction(()=>!monochrome.run.hidden);await page.keyboard.up('e');
 await page.getByRole('button',{name:'Return to stairs',exact:true}).click();await frame.waitForTimeout(250);await page.screenshot({path:'work/new-gameplay/stairs.png',timeout:10000});
 await frame.evaluate(()=>{const g=monochrome;g.player.x=-2.6;g.player.z=-25.6;g.player.height=3.6;g.input.setView(Math.PI,-.35);g.ui.hideScreen();g.input.clear();});await frame.waitForTimeout(350);await page.screenshot({path:'work/new-gameplay/stairs-down.png',timeout:10000});
 assert.ok(await frame.evaluate(()=>[...monochrome.world.targets.values()].filter(t=>t.type==='halloween').every(t=>t.position.z>=monochrome.run.layout.stairs.bottomZ||t.position.z<=monochrome.run.layout.stairs.topZ)),'seasonal props stay outside the descent');
 await page.getByRole('button',{name:'Return to stairs',exact:true}).click();await frame.waitForTimeout(250);
 // Test sprint on a collision-clear route rather than sprinting into a wall.
 await frame.evaluate(()=>{const g=monochrome;g.input.setView(Math.PI,0);g.player.stamina=1;g.player.exhausted=false;g.player.staminaRest=0;});await frame.locator('canvas').first().focus();await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForTimeout(900);await page.keyboard.up('w');await page.keyboard.up('Shift');
 assert.ok(await frame.evaluate(()=>monochrome.player.stamina<1));
 await page.getByRole('button',{name:'Start hunting',exact:true}).click();await frame.waitForFunction(()=>monochrome.run.huntElapsed>=90&&monochrome.enemy().released);assert.deepEqual(errors,[]);console.log('PASS hidden home entry, password-only route, new maze preview, one drawer per room, lower floor, physical grilles and stamina HUD',details);
}finally{await browser.close();}
