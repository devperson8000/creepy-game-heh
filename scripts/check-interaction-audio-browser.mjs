import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.route('**/src/main.js*',route=>route.fulfill({contentType:'text/javascript',body:''}));await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');
 const result=await page.evaluate(async()=>{
  const {playInteractionSound}=await import('/src/interaction-sounds.js'),result=[];
  for(const type of ['walk','sprint','drawer','key','locks','clue','torch','keypad']){
   const context=new OfflineAudioContext(1,12000,24000),noise=context.createBuffer(1,12000,24000),data=noise.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296-.5);}
   const sources=new Set();playInteractionSound(context,context.destination,noise,type,sources);const rendered=(await context.startRendering()).getChannelData(0);let peak=0,energy=0,tail=0;
   for(let i=0;i<rendered.length;i++){peak=Math.max(peak,Math.abs(rendered[i]));energy+=rendered[i]**2;if(i>4320&&i<6000)tail+=rendered[i]**2;}
   result.push({type,peak,rms:Math.sqrt(energy/rendered.length),tail:Math.sqrt(tail/1680),remaining:sources.size});
  }
  return result;
 });
 for(const sound of result){assert.ok(sound.peak>.001&&sound.peak<.7,`${sound.type}: audible without clipping`);assert.ok(sound.rms>.0001);assert.equal(sound.remaining,0);}
 assert.ok(result.find(s=>s.type==='key').tail>.0002,'metallic key ring retains a short decay');console.log('PASS real OfflineAudioContext renders footsteps, drawer creak, key/lock chimes and paper sounds without clipping; all source nodes clean up',result);
}finally{await browser.close();}
