import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {microphoneCapture,installMicrophoneGain} from './helpers/microphone-capture.mjs';

const capture=await microphoneCapture(),base=process.env.GAME_TEST_URL||'http://localhost:5184',usePeer=!!process.env.VOICE_TEST_ICE_SERVERS;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding',...capture.args]});
const context=await browser.newContext({viewport:{width:800,height:600}}),errors=[],rpcErrors=[],packets=[];
if(usePeer)await context.addInitScript(servers=>{const Peer=RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(config){super({...config,iceServers:servers});}};},JSON.parse(process.env.VOICE_TEST_ICE_SERVERS));
await context.addInitScript(installMicrophoneGain);
await context.addInitScript(()=>{
 try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true,volume:0}));}catch{}
 // Keep real scene construction, collisions, controls, audio and simulation;
 // suppress GPU draws so network measurements don't depend on software rendering.
 for(const T of [WebGLRenderingContext,WebGL2RenderingContext])for(const method of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced'])if(T.prototype[method])T.prototype[method]=()=>{};
});
context.on('page',page=>{
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/rpc/game_send_input')&&r.status()>=400)rpcErrors.push(r.status());});
 page.on('request',r=>{if(r.url().includes('/rpc/game_send_input')){const packet=r.postDataJSON()?.p_input;if(packet)packets.push(packet);}});
});
const host=await context.newPage(),guest=await context.newPage(),pages=[host,guest],name='Microphone QA '+Date.now();
async function quiet(page){await page.evaluate(usePeer=>{const g=monochrome;g.arrival.dispose();g.ui.hideScreen();g.input.clear();g.renderer.domElement.tabIndex=0;g.renderer.render=()=>{};if(!usePeer)g.client.voice.sendGameplay=()=>false;window.peerInputs=[];g.client.voice.subscribeGameplay(e=>{if(e.type==='input')peerInputs.push(e.payload.input);});},usePeer);}
try{
 for(const p of pages){p.setDefaultTimeout(45000);await p.goto(base);await p.click('#lobby-multiplayer');await p.fill('#lobby-player-name',p===host?'Mic host':'Mic guest');}
 await host.fill('#lobby-create-name',name);await host.click('#lobby-create');await host.waitForSelector('.in-waiting-room');await host.evaluate(()=>document.querySelector('#waiting-terminal-button').click());
 await guest.locator('.lobby-list-row').filter({hasText:name}).getByRole('button',{name:'Enter lobby'}).click();await host.getByRole('button',{name:'Approve',exact:true}).evaluate(b=>b.click());
 await guest.waitForSelector('.in-waiting-room');await guest.evaluate(()=>document.querySelector('#waiting-terminal-button').click());await guest.click('#lobby-ready');await host.waitForFunction(()=>!document.querySelector('#lobby-start')?.disabled);await host.click('#lobby-start');
 for(const p of pages){await p.waitForFunction(()=>!!window.monochrome);await quiet(p);}
 const guestId=await guest.evaluate(()=>monochrome.client.id);
 if(usePeer)await host.waitForFunction(()=>peerInputs.length>0,null,{timeout:20000});
 await guest.evaluate(()=>{window.observedEnemies=[];monochrome.client.subscribe(e=>{if(e.type==='snapshot')observedEnemies.push(e.snapshot.enemy);});});
 await guest.click('#voice-toggle');await guest.waitForFunction(()=>!monochrome.client.voice.muted&&!!window.microphoneGain);
 assert.equal(await guest.evaluate(()=>monochrome.client.voice.noiseLevel),0);
 // The real W/Shift event path must still work with the microphone button focused.
 await guest.evaluate(()=>{monochrome.ui.hideScreen();window.motionSamples=[];window.sampleMotion=setInterval(()=>motionSamples.push(monochrome.state.players.get(monochrome.client.id).z),16);});
 await guest.keyboard.down('ShiftLeft');await guest.keyboard.down('KeyW');await guest.waitForTimeout(350);await guest.keyboard.up('KeyW');await guest.keyboard.up('ShiftLeft');await guest.waitForTimeout(350);
 await guest.waitForFunction(()=>monochrome.state.players.get(monochrome.client.id).inputSequence>0,null,{timeout:15000});
 const movement=await guest.evaluate(()=>{clearInterval(sampleMotion);const p=monochrome.state.players.get(monochrome.client.id);return {from:motionSamples[0],to:motionSamples.at(-1),reverse:motionSamples.slice(1).filter((z,i)=>z<motionSamples[i]-.02).length,ack:p.inputSequence};});
 assert.ok(movement.to>movement.from+.5);assert.equal(movement.reverse,0);assert.ok(movement.ack>0);
 await host.waitForFunction(id=>!monochrome.state.players.get(id).moving,guestId);
 const positions=await host.evaluate(guestId=>{
  const g=monochrome,nav=g.world.enemyNavigation,layout=g.run.layout,points=[];
  for(let z=layout.mazeStart;z<layout.size;z++)for(let x=0;x<layout.size;x++)if(layout.grid[z][x]){const p={x:(x-8)*2.6,z:(z-8)*2.6,height:-7.2};if(g.world.canMove(p.x,p.z)&&nav.canMove(p.x,p.z))points.push(p);}
  let chosen;
  for(const player of points){for(const enemy of points){const d=Math.hypot(player.x-enemy.x,player.z-enemy.z);if(d<18||d>20.5||nav.canSee(enemy,player))continue;const path=nav.findPath(enemy,player);if(path.length&&Math.hypot(path.at(-1).x-player.x,path.at(-1).z-player.z)<.2){chosen={player,enemy};break;}}if(chosen)break;}
  if(!chosen)throw new Error('No reachable occluded microphone fixture points');
  g.run.boardsOpen=true;g.run.huntElapsed=190;
  Object.assign(g.state.players.get(guestId),chosen.player);Object.assign(g.simulation.enemy,{position:{x:chosen.enemy.x,z:chosen.enemy.z},released:true,mode:'patrol',roamRemaining:0,lastSeen:null,lastHeard:null,path:[],areaTime:0});
  return chosen;
 },guestId);
 await guest.evaluate(p=>{Object.assign(monochrome.state.players.get(monochrome.client.id),p);microphoneGain.gain.value=.2;},positions.player);
 await guest.waitForFunction(()=>monochrome.client.voice.noiseLevel===2);await host.waitForFunction(id=>monochrome.state.players.get(id).voiceLevel===2,guestId);
 assert.notEqual(await host.evaluate(()=>monochrome.simulation.enemy.mode),'chase','distant conversation remains below hearing range');
 await guest.evaluate(()=>microphoneGain.gain.value=1);await guest.waitForFunction(()=>monochrome.client.voice.noiseLevel===4);
 await host.waitForFunction(id=>monochrome.state.players.get(id).voiceLevel===4,guestId);
 // Arrange each hearing phase after its report arrives. An unrestrained patrol
 // can leave the chosen radius while the database delivers a new voice tier.
 await host.evaluate(({id,positions})=>{const g=monochrome;Object.assign(g.state.players.get(id),positions.player);Object.assign(g.simulation.enemy,{position:{x:positions.enemy.x,z:positions.enemy.z},mode:'patrol',roamRemaining:0,lastSeen:null,lastHeard:null,path:[],repath:0,idleFor:0,areaTime:0,areaOrigin:{...positions.enemy}});},{id:guestId,positions});
 await guest.evaluate(p=>Object.assign(monochrome.state.players.get(monochrome.client.id),p),positions.player);
 await host.waitForFunction(()=>monochrome.simulation.enemy.mode==='chase'&&monochrome.simulation.enemy.sensedBy==='sound');
 await guest.waitForFunction(()=>observedEnemies.some(e=>e.mode==='chase'));
 const pursuit=await host.evaluate(id=>{const p=monochrome.state.players.get(id);return{point:monochrome.simulation.enemy.lastHeard,player:{x:p.x,z:p.z},path:monochrome.simulation.enemy.path.length};},guestId);
 assert.ok(Math.hypot(pursuit.point.x-pursuit.player.x,pursuit.point.z-pursuit.player.z)<.1,'heard destination comes from the authoritative player');assert.ok(pursuit.path>0);
 await guest.click('#voice-toggle');assert.equal(await guest.evaluate(()=>monochrome.client.voice.noiseLevel),0);
 await host.waitForFunction(id=>monochrome.state.players.get(id).voiceLevel===0,guestId);
 console.log('PASS actual microphone → '+(usePeer?'authenticated peer inputs':'authenticated database inputs')+' → shared scream pursuit; silent mic, distant speech, W/Shift and mute',movement);
 // Return to the safe clock while exercising actual held-E drawer interactions.
 await host.evaluate(()=>{monochrome.run.huntElapsed=0;});
 for(const row of [2,1,0]){
  const at=await host.evaluate(({id,row})=>{const g=monochrome,r=g.run.layout.rooms[0],target=g.world.targets.get(`drawer-${row}`),at=target.mesh.getWorldPosition(g.camera.position.clone()),p={x:(r.x-8)*2.6+r.normal.x*.4,z:(r.z-8)*2.6+r.normal.z*.4,height:-7.2};Object.assign(g.state.players.get(id),p);return{p,yaw:Math.atan2(p.x-at.x,p.z-at.z),pitch:Math.atan2(at.y-p.height-1.65,Math.hypot(p.x-at.x,p.z-at.z))};},{id:guestId,row});
  await guest.evaluate(({p,yaw,pitch})=>{const g=monochrome;Object.assign(g.state.players.get(g.client.id),p);g.input.setView(yaw,pitch);g.ui.hideScreen();g.renderer.domElement.focus();},at);
  await guest.getByText('Search drawer',{exact:true}).waitFor();await guest.keyboard.down('KeyE');
  await host.waitForFunction(row=>monochrome.run.drawers[row].opened,row);await guest.keyboard.up('KeyE');await guest.waitForFunction(row=>monochrome.run.drawers[row].opened,row);
 }
 const peerPackets=await host.evaluate(()=>peerInputs),allPackets=[...packets,...peerPackets];
 assert.ok(allPackets.some(p=>p.voiceLevel===4));assert.ok(allPackets.some(p=>p.voiceLevel===0));
 assert.ok(allPackets.every(p=>Object.keys(p).length===11&&p.commands.every(c=>Object.keys(c).length===9)),'voice must never enter movement replay history');
 if(usePeer)assert.ok(peerPackets.some(p=>p.voiceLevel===4),'the scream must travel through the actual peer channel');
 assert.deepEqual(rpcErrors,[]);assert.deepEqual(errors,[]);
 console.log('PASS '+(usePeer?'WebRTC peer gameplay':'database fallback')+'; all three cabinet drawers open using actual guest E holds; no invalid inputs, runtime errors or movement-history voice replay');
}catch(error){console.error('Browser diagnostics',{errors,rpcErrors,packets:packets.length,packetFields:packets[0]&&Object.keys(packets[0])});for(const p of pages)console.error(await p.evaluate(()=>({text:document.body.innerText.slice(-1500),phase:window.monochrome?.run.phase,noise:window.monochrome?.client.voice.noiseLevel,enemy:window.monochrome?.simulation?.enemy})).catch(()=>null));throw error;
}finally{for(const p of pages)await Promise.race([p.evaluate(()=>window.monochrome?.client.close()).catch(()=>{}),new Promise(r=>setTimeout(r,1000))]);await browser.close();await capture.dispose();}
