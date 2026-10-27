import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {microphoneCapture,installMicrophoneGain} from './helpers/microphone-capture.mjs';

const capture=await microphoneCapture(),browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox',...capture.args]}),page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
// Deterministic hardware gain on a genuine getUserMedia source, before its analyser.
await page.addInitScript(installMicrophoneGain);
try{
 await page.goto((process.env.GAME_TEST_URL||'http://localhost:5184')+'/scripts/fixtures/microphone.html');await page.waitForFunction(()=>!!window.voice);
 await page.click('#voice-toggle');await page.waitForFunction(()=>!voice.muted&&!!window.microphoneGain);
 assert.equal(await page.evaluate(()=>voice.noiseLevel),0,'enabled silent microphone does not attract');
 for(const [gain,expected] of [[.05,1],[.2,2],[.4,3],[1,4],[0,0]]){
  await page.evaluate(gain=>microphoneGain.gain.value=gain,gain);
  try{await page.waitForFunction(level=>voice.noiseLevel===level,expected,{timeout:5000});}catch(error){console.error('Microphone tier mismatch',await page.evaluate(()=>({level:voice.noiseLevel,text:document.querySelector('#voice-noise')?.textContent,meter:document.querySelector('#voice-noise-meter')?.style.cssText,gain:microphoneGain.gain.value})));throw error;}
  assert.equal(await page.locator('#voice-noise-meter').getAttribute('aria-valuenow'),String(expected));
 }
 await page.evaluate(()=>microphoneGain.gain.value=1);await page.waitForFunction(()=>voice.noiseLevel===4);
 const afterStall=await page.evaluate(()=>{const until=performance.now()+400;while(performance.now()<until){}return voice.noiseLevel;});
 assert.equal(afterStall,0,'a stale analyser reading must not keep publishing screams after a stalled frame');
 await page.waitForFunction(()=>voice.noiseLevel===4);
 await page.click('#voice-toggle');assert.equal(await page.evaluate(()=>voice.noiseLevel),0);
 assert.equal(await page.locator('#voice-noise').isVisible(),false);
 await page.locator('#voice-calibration summary').click();await page.locator('#voice-sensitivity').fill('1.5');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('monochrome.settings')).micSensitivity),1.5);
 await page.evaluate(()=>disconnect());assert.equal(await page.evaluate(()=>voice.noiseLevel),0);
 await page.evaluate(()=>voice.dispose());assert.equal(await page.locator('#voice-chat').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS actual microphone capture: silence, four sustained loudness tiers, meter, immediate mute, saved sensitivity, disconnect and disposal');
}finally{await browser.close();await capture.dispose();}
