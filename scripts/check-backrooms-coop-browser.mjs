import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
await mkdir('work/multiplayer',{recursive:true});const base=process.env.GAME_TEST_URL||'http://localhost:5182';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];let host,guest;
try{
 const ctx=await browser.newContext({viewport:{width:800,height:500}});ctx.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(90000);});
 host=await ctx.newPage();guest=await ctx.newPage();
 await host.goto(base+'/backrooms');await host.locator('[data-action="multiplayer"]').click();await host.waitForFunction(()=>window.backrooms.lobby?.client.connected);console.log('Host connected');
 await host.locator('[data-name]').fill('Host');await host.locator('[data-create]').click();await host.locator('[name="name"]').fill('Level Zero Test '+Date.now());await host.locator('[name="privacy"]').selectOption('friends');await host.locator('button[type="submit"]').click();await host.waitForFunction(()=>window.backrooms.lobby?.room?.members.length===1);
 const code=await host.locator('[data-code]').innerText();const value=code.split(': ')[1];console.log('Room created',value);
 await guest.goto(base+'/backrooms');await guest.locator('[data-action="multiplayer"]').click();await guest.waitForFunction(()=>window.backrooms.lobby?.client.connected);await guest.locator('[data-name]').fill('Guest');await guest.locator('[aria-label="Room code"]').fill(value);await guest.locator('[data-join-code] button').click();
 await host.waitForSelector('.br-join-request');await host.getByRole('button',{name:'Accept',exact:true}).click();
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>window.backrooms.lobby?.room?.members.length===2)));console.log('Guest joined');
 await host.screenshot({path:'work/multiplayer/lobby.png'});
 const peerReady=await guest.evaluate(()=>{const l=window.backrooms.lobby;return l.room.members.filter(m=>m.id!==l.client.id).every(m=>l.client.voice.gameConnected(m.id));});
 await guest.locator('.br-team-chat input').fill('Stay together');await guest.locator('.br-team-chat button').click();
 if(peerReady){await host.waitForFunction(()=>document.querySelector('.br-team-chat ol')?.textContent.includes('Stay together'));console.log('Peer text chat delivered');}
 else{assert.match(await guest.locator('.br-team-chat small').textContent(),/connecting/);console.log('Chat correctly reports pending peer connection; gameplay uses authenticated fallback.');}
 await guest.locator('[data-start]').click();await host.waitForFunction(()=>window.backrooms.lobby.room.members.every(p=>p.ready));await host.locator('[data-start]').click();
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>!!window.backrooms.net&&Object.keys(window.backrooms.net.state.players).length===2)));await guest.waitForFunction(()=>window.backrooms.net.monsters!==null);console.log('Both in synchronized game');await Promise.all([host,guest].map(p=>p.setViewportSize({width:640,height:400})));
 assert.deepEqual(errors,[]);
 // Keep both real browser windows active in headless; local pause doesn't pause a multiplayer world.
 await Promise.all([host,guest].map(p=>p.evaluate(()=>{if(window.backrooms.paused)document.querySelector('[data-action="start"]').click();})));
 await host.waitForFunction(()=>window.backrooms.team.actors.size===1);
 const guestId=await guest.evaluate(()=>window.backrooms.net.player.id);const hostId=await host.evaluate(()=>window.backrooms.net.player.id);
 const before=await host.evaluate(id=>({...window.backrooms.net.state.players[id]}),guestId);
 await guest.keyboard.down('KeyD');await host.waitForFunction(({id,x,z})=>Math.hypot(window.backrooms.net.state.players[id].x-x,window.backrooms.net.state.players[id].z-z)>1.3,{id:guestId,x:before.x,z:before.z});await guest.keyboard.up('KeyD');console.log('Guest movement reached host authority');
 await guest.waitForFunction(()=>window.backrooms.net.player.inputSequence>0);
 await guest.evaluate(()=>{if(!window.backrooms.paused)document.querySelector('[data-action="pause"]').click();});await host.waitForFunction(id=>window.backrooms.net.state.players[id].speed===0,guestId);await guest.waitForTimeout(1000);
 // Place a trusted authoritative player beside a fragment; issue the real guest E-hold through the network.
 await host.evaluate(id=>{const s=window.backrooms.net.state,p=s.players[id],f=s.round.parts[0];p.x=f.x-.8;p.z=f.z+1;p.y=0;},guestId);
 await guest.waitForFunction(()=>Math.abs(window.backrooms.player.x-window.backrooms.round.parts[0].x)<1.4);
 await guest.evaluate(()=>{if(window.backrooms.paused)document.querySelector('[data-action="start"]').click();});await guest.keyboard.down('KeyE');await host.waitForFunction(()=>window.backrooms.net.state.round.collected===1);await guest.keyboard.up('KeyE');await guest.waitForFunction(()=>window.backrooms.round.collected===1);console.log('Shared pickup synchronized');
 await host.evaluate(()=>{const s=window.backrooms.encounter.simulation.state;s.elapsed=181;s.position={x:37,z:-16};});await guest.waitForFunction(()=>window.backrooms.encounter.actor.root.visible&&window.backrooms.encounter.simulation.state.elapsed>180);assert.ok(await guest.evaluate(()=>{const e=window.backrooms.encounter,m=window.backrooms.net.monsters.needle;return Math.hypot(e.actor.root.position.x-m.position.x,e.actor.root.position.z-m.position.z)<.1;}));console.log('Host monster pose synchronized to guest');
 // A remote object id must not allow the guest to unlock a distant door.
 await guest.evaluate(()=>window.backrooms.net.interact('door'));await guest.waitForTimeout(500);assert.equal(await host.evaluate(()=>window.backrooms.net.state.round.doorOpen),false);
 // Test a real rescue action and its authoritative result.
 await host.evaluate(({hostId,guestId})=>{const s=window.backrooms.net.state;s.round.doorOpen=true;Object.assign(s.players[hostId],{x:52,z:-16,y:0});Object.assign(s.players[guestId],{x:52,z:-18,y:-4});},{hostId,guestId});
 await host.waitForFunction(()=>window.backrooms.net.target()?.id.startsWith('rope:'));await host.keyboard.down('KeyE');await host.waitForFunction(id=>window.backrooms.net.state.players[id].y===0,guestId);await host.keyboard.up('KeyE');console.log('Rope rescue synchronized');
 // Shared loss and host retry must reset both clients without reconnecting their lobby.
 await host.evaluate(()=>window.backrooms.net.finish('Howler'));await Promise.all([host,guest].map(p=>p.waitForFunction(()=>window.backrooms.round.phase==='dead')));await host.waitForFunction(()=>document.querySelector('[data-action="start"]').textContent.includes('Restart team'));await host.locator('[data-action="start"]').click();
 await Promise.all([host,guest].map(p=>p.waitForFunction(()=>window.backrooms.net.state.epoch===1&&window.backrooms.round.phase==='playing')));assert.equal(await guest.evaluate(()=>window.backrooms.round.collected),0);console.log('Team restart synchronized');
 // All players must reach the vent.
 await host.evaluate(()=>{const s=window.backrooms.net.state;s.round.doorOpen=true;for(const p of Object.values(s.players))Object.assign(p,{x:66,z:-16,y:0,climbing:false});window.backrooms.net.interact('vent');});
 assert.equal(await host.evaluate(()=>window.backrooms.net.state.round.phase),'playing');
 await guest.waitForFunction(()=>window.backrooms.round.doorOpen&&window.backrooms.player.x>65);await guest.keyboard.down('KeyE');await Promise.all([host,guest].map(p=>p.waitForFunction(()=>window.backrooms.round.phase==='won')));await guest.keyboard.up('KeyE');console.log('Team exit synchronized');
 await guest.evaluate(()=>window.backrooms.dispose());await host.waitForFunction(()=>Object.keys(window.backrooms.net.state.players).length===1);assert.deepEqual(errors,[]);
 await host.screenshot({path:'work/multiplayer/game.png'});console.log('PASS real Supabase two-tab lobby/code/ready/start, guest movement, shared pickup, range rejection, rope rescue, synchronized restart and team exit, leave and cleanup.');
}catch(e){for(const [label,p]of [['host',host],['guest',guest]])try{console.log(label,await p.evaluate(()=>({paused:window.backrooms?.paused,player:window.backrooms?.net?.player,round:window.backrooms?.net?.state.round,notice:document.querySelector('.br-toast')?.textContent,target:document.querySelector('[data-target]')?.textContent})));}catch{}throw e;
}finally{for(const p of [host,guest])try{await p?.evaluate(()=>window.backrooms?.dispose());}catch{}await browser.close();}
