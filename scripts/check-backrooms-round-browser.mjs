import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const base=process.env.GAME_TEST_URL||'http://localhost:5182';await mkdir('work/playable',{recursive:true});
const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const errors=[];
try{
 const p=await b.newPage({viewport:{width:640,height:400}});p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/backrooms');await p.waitForFunction(()=>!!window.backrooms?.encounter.actor);
 assert.equal(await p.evaluate(()=>window.backrooms.encounter.hunter),null);
 assert.equal(await p.evaluate(()=>window.backrooms.encounter.actor.root.visible),false);
 await p.locator('[data-action="start"]').click();
 const hold=async()=>{const before=await p.evaluate(()=>{const r=window.backrooms.round;return JSON.stringify([r.collected,r.repaired,r.climbing,r.hasKey,r.doorOpen,r.hasTorch,r.phase]);});await p.keyboard.down('KeyE');await p.waitForFunction(before=>{const r=window.backrooms.round;return JSON.stringify([r.collected,r.repaired,r.climbing,r.hasKey,r.doorOpen,r.hasTorch,r.phase])!==before;},before);await p.keyboard.up('KeyE');await p.waitForTimeout(200);};
 for(let i=0;i<4;i++){await p.evaluate(i=>{const g=window.backrooms,f=g.round.parts[i];g.player.x=f.x;g.player.z=f.z+1;},i);await hold();assert.equal(await p.evaluate(()=>window.backrooms.round.collected),i+1);console.log('fragment',i+1);}
 await p.evaluate(()=>{const g=window.backrooms;g.player.x=g.round.ladder.x;g.player.z=g.round.ladder.z+1;});await hold();assert.equal(await p.evaluate(()=>window.backrooms.round.repaired),true);
 await hold();await p.waitForFunction(()=>window.backrooms.round.ladderHeight>.75);await hold();assert.equal(await p.evaluate(()=>window.backrooms.round.hasKey),true);
 await p.evaluate(()=>{const g=window.backrooms;g.player.x=g.round.door.x;g.player.z=g.round.door.z+1;g.player.y=0;});await hold();assert.equal(await p.evaluate(()=>window.backrooms.round.doorOpen),true);
 await p.evaluate(()=>{const g=window.backrooms;g.player.x=52;g.player.z=-18;g.player.y=0;});await p.waitForFunction(()=>window.backrooms.round.fell);assert.equal(await p.evaluate(()=>window.backrooms.round.phase),'playing');await p.screenshot({path:'work/playable/pit-lower.png'});
 // Follow the actual lower route using movement, then walk up the stairs.
 await p.evaluate(()=>{const g=window.backrooms;g.player.x=59.5;g.player.z=-11.5;g.player.y=-4;});
 await p.keyboard.down('KeyD');await p.waitForFunction(()=>window.backrooms.player.x>66);await p.keyboard.up('KeyD');assert.ok(await p.evaluate(()=>window.backrooms.player.y>-.3));
 await p.evaluate(()=>{const g=window.backrooms;g.player.x=g.round.flashlight.x;g.player.z=g.round.flashlight.z+1;g.player.y=0;});await hold();assert.equal(await p.evaluate(()=>window.backrooms.round.hasTorch),true);
 await p.evaluate(()=>{const g=window.backrooms;g.player.x=g.round.vent.x;g.player.z=g.round.vent.z+1;g.player.y=0;});await hold();await p.waitForFunction(()=>window.backrooms.round.phase==='won');assert.match(await p.locator('#br-title').innerText(),/You escaped/);await p.screenshot({path:'work/playable/won.png'});
 await p.locator('[data-action="start"]').click();await p.waitForFunction(()=>!!window.backrooms?.encounter.actor);assert.equal(await p.evaluate(()=>window.backrooms.round.collected),0);
 await p.goto(base+'/backrooms?mode=ambush');await p.waitForFunction(()=>!!window.backrooms?.encounter.actor&&!!window.backrooms.encounter.hunter);
 assert.ok(await p.evaluate(()=>{const e=window.backrooms.encounter,s=window.backrooms.world.map.spawn;return [e.simulation,e.hunterSimulation].every(a=>Math.hypot(a.state.position.x-s.x,a.state.position.z-s.z)>26);}));
 await p.locator('[data-action="start"]').click();
 await p.evaluate(()=>{const g=window.backrooms,h=g.encounter.hunterSimulation.state;h.elapsed=60;h.position={x:-5,z:3};h.mode='ambush';g.player.x=-5;g.player.z=6;});await p.waitForFunction(()=>document.querySelector('.br-ambush'));assert.equal(await p.evaluate(()=>window.backrooms.encounter.hunterSimulation.state.scareCount),1);await p.screenshot({path:'work/playable/ambush.png'});
 await p.evaluate(()=>{const g=window.backrooms,h=g.encounter.hunterSimulation.state;g.player.x=h.position.x;g.player.z=h.position.z;});await p.waitForFunction(()=>window.backrooms.round.phase==='dead');await p.waitForFunction(()=>document.querySelector('#br-title')?.innerText.includes('STALKER'));
 await p.evaluate(()=>window.backrooms.dispose());
 const m=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});m.on('pageerror',e=>errors.push(e.message));await m.route('**/models/teaser/needlelimbs.glb',r=>r.abort());await m.goto(base+'/backrooms?mode=ambush');await m.waitForFunction(()=>!!window.backrooms?.encounter.hunter);await m.locator('[data-action="start"]').click();assert.equal(await m.locator('[data-key="KeyE"]').isVisible(),true);await m.locator('[data-action="pause"]').click();await m.screenshot({path:'work/playable/mobile.png'});await m.locator('[data-action="start"]').click();await m.evaluate(()=>{const g=window.backrooms,h=g.encounter.hunterSimulation.state;h.elapsed=60;h.mode='investigate';g.player.x=h.position.x;g.player.z=h.position.z;});await m.waitForFunction(()=>window.backrooms.round.phase==='dead');await m.evaluate(()=>window.backrooms.dispose());
 assert.deepEqual(errors,[]);console.log('PASS: classic route fragments/repair/climb/key/door, recoverable pit fall/stairs/vent/replay; ambush mode two monsters, scare/chase/capture; mobile independent hunter/disposal.');
}finally{await b.close();}
