import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 const Native=window.AudioContext;window.voiceStarts=[];
 window.AudioContext=class extends Native{
  constructor(...args){super(...args);window.openingContext=this;}
  createGain(){const gain=super.createGain(),connect=gain.connect.bind(gain);gain.connect=(target,...rest)=>{const result=connect(target,...rest);if(target===this.destination){window.voiceMeter=this.createAnalyser();voiceMeter.fftSize=2048;connect(voiceMeter);}return result;};return gain;}
  createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{if(source.buffer.duration!==2)voiceStarts.push({duration:source.buffer.duration,offset:args[1]||0});return start(...args);};return source;}
 };
});
try{await page.goto('http://localhost:5173/scripts/fixtures/opening-audio.html');await page.waitForFunction(()=>window.openingAudioReady);await page.locator('#sound').click();await page.waitForFunction(()=>openingAudio.enabled);
 for(const time of [12.4,17.4,23.4,33]){await page.evaluate(t=>updateOpeningAudio(t),time);await page.waitForTimeout(400);const peak=await page.evaluate(()=>{const d=new Float32Array(voiceMeter.fftSize);voiceMeter.getFloatTimeDomainData(d);return Math.max(...d.map(Math.abs));});assert.ok(peak>.01,`audible, decoded speech at ${time}: ${peak}`);assert.ok(peak<1,`unclipped speech at ${time}`);console.log('Speech at',time,'peak',peak.toFixed(3));}
 const starts=await page.evaluate(()=>voiceStarts);assert.equal(starts.length,4);assert.ok(starts.every(s=>s.duration>1&&s.duration<2.5&&s.offset===0));
 await page.evaluate(()=>openingAudio.toggle());assert.equal(await page.evaluate(()=>openingAudio.enabled),false);await page.evaluate(()=>openingAudio.dispose());await page.waitForFunction(()=>openingContext.state==='closed');assert.deepEqual(errors,[]);console.log('PASS four neural dialogue files decoded and audible, browser gesture unlock, clean signal, mute and context disposal');
}finally{await browser.close();}
