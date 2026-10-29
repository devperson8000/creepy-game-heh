import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {WARNING_START,QUESTION_START,SPRINT_START,STATIC_START,MUSIC_START,SCORE_OFFSET,MONOCHROME_HINTS,BRIEFING_DIALOGUE} from '../src/briefing-schedule.js';import score from '../public/audio/launch/score.json' with {type:'json'};
const base=process.env.GAME_TEST_URL||'http://localhost:5187',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),errors=[];await mkdir('work/camcorder-final',{recursive:true});
try{
 for(const [name,width,height]of [['desktop',1440,900],['phone',390,844],['landscape',844,390],['ultrawide',2560,1080]]){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Shader Error|VALIDATE_STATUS|Error linking/.test(m.text()))errors.push(m.text());});await page.goto(base+'/scripts/fixtures/camcorder.html');await page.waitForFunction(()=>window.filmReady);
  const r=await page.locator('.launch-film-frame').boundingBox();assert.ok(Math.abs(r.width/r.height-4/3)<.001);assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+.1&&r.y+r.height<=height+.1);
  for(const [shot,time]of [['welcome',4],['crossing',MONOCHROME_HINTS.find(c=>c.kind==='crossing').at+.425],['eyes',WARNING_START+.7],['question',QUESTION_START+.2],['charge',STATIC_START-.15]]){
   await page.evaluate(t=>seek(t),time);await page.waitForTimeout(90);await page.locator('.launch-film-frame').screenshot({path:`work/camcorder-final/${name}-${shot}.png`});
   if(shot==='eyes'||shot==='question')assert.equal(await page.locator('[data-launch-briefing]').getAttribute('data-monochrome-beat'),'stationary');if(shot==='charge')assert.equal(await page.locator('[data-launch-briefing]').getAttribute('data-monochrome-beat'),'sprint');
  }
  await page.evaluate(t=>seek(t),MUSIC_START+score.accents[2]-SCORE_OFFSET+2.1);await page.locator('[data-word-count="3"]').waitFor();
  assert.equal(await page.locator('.launch-title').evaluate(el=>{const frame=el.parentElement.getBoundingClientRect();return [...el.querySelectorAll('strong,button')].every(child=>{const r=child.getBoundingClientRect();return r.left>=frame.left&&r.right<=frame.right&&r.top>=frame.top&&r.bottom<=frame.bottom})}),true,`${name} tape title must fit`);
  await page.evaluate(()=>player.dispose());assert.equal(await page.locator('[data-launch-briefing]').count(),0);await page.close();
 }
 const low=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await low.goto(base+'/scripts/fixtures/camcorder.html');await low.waitForFunction(()=>window.filmReady);await low.addStyleTag({content:'.camcorder-hud,.launch-briefing-caption,.launch-skip{visibility:hidden!important}'});await low.evaluate(()=>seek(1));await low.waitForTimeout(100);const a=await low.locator('.launch-briefing-scene canvas').screenshot();await low.evaluate(()=>seek(3));await low.waitForTimeout(100);assert.equal((await low.locator('.launch-briefing-scene canvas').screenshot()).equals(a),true,'reduced motion freezes lens motion and tape grain within the shot');await low.evaluate(()=>player.dispose());await low.close();
 assert.deepEqual(errors,[]);console.log('PASS4:3 aperture, shader compile, all viewport tapes/titles, stationary question→charge, reduced motion and disposal');
}finally{await browser.close()}
