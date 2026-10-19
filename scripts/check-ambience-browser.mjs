import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:''}));await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');
 await page.evaluate(async()=>{
  const Base=window.AudioContext;window.roomContexts=[];window.roomGains=[];window.roomOscillators=0;
  window.AudioContext=class extends Base{constructor(...args){super(...args);roomContexts.push(this);}createGain(){const node=super.createGain();roomGains.push(node);return node;}createOscillator(){roomOscillators++;return super.createOscillator();}};
  const {createRoomAmbience}=await import('/src/room-ambience.js');window.roomProbe=createRoomAmbience();document.addEventListener('click',()=>void roomProbe.resume(),{once:true});
 });
 await page.mouse.click(10,10);await page.waitForFunction(()=>roomContexts[0]?.state==='running');
 const safe=await page.evaluate(()=>roomGains[0].gain.value);await page.evaluate(()=>roomProbe.update({huntElapsed:89.8,threat:1,delta:.1}));await page.waitForTimeout(550);const hush=await page.evaluate(()=>roomGains[0].gain.value);assert.ok(hush<safe*.4);
 const count=await page.evaluate(()=>roomOscillators);await page.evaluate(()=>roomProbe.update({huntElapsed:95,threat:.9,sprinting:true,delta:.1}));assert.ok(await page.evaluate(()=>roomOscillators)>count,'hunting schedules the heartbeat pair');
 await page.evaluate(()=>roomProbe.setMuted(true));await page.waitForTimeout(600);assert.ok(await page.evaluate(()=>roomGains[0].gain.value)<.0004);await page.evaluate(()=>{roomProbe.setMuted(false);roomProbe.update({huntElapsed:95,threat:.5,hidden:true,delta:.1});roomProbe.pause();});await page.waitForFunction(()=>roomContexts[0].state==='suspended');await page.evaluate(()=>roomProbe.dispose());await page.waitForFunction(()=>roomContexts[0].state==='closed');assert.deepEqual(errors,[]);
 console.log('PASS real gesture-gated room ambience: pre-six hush, hunting heartbeat, sprint/closet mix, mute, pause and audio-context cleanup');
}finally{await browser.close();}
