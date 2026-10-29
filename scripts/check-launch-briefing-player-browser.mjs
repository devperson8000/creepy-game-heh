import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {MUSIC_START,STATIC_START,SCORE_OFFSET,filmTimeAt} from '../src/briefing-schedule.js';
import score from '../public/audio/launch/score.json' with {type:'json'};
const base=process.env.GAME_TEST_URL||'http://localhost:5187';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
const errors=[];await mkdir('work/launch-player',{recursive:true});
async function pageAt(at,{width=1440,height=900,fallback=false,failed=false}={}){
 const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));

 await page.addInitScript(()=>{window.audioClocks=[];const Original=AudioContext;window.AudioContext=class extends Original{constructor(...args){super(...args);audioClocks.push(this)}createBufferSource(){const s=super.createBufferSource(),start=s.start;s.start=(when,offset=0,...rest)=>{if(s.buffer?.duration>57&&s.buffer.duration<59){window.scoreSource={when,offset};window.scoreStarts=(window.scoreStarts||0)+1;}return start.call(s,when,offset,...rest)};return s}};});
 if(fallback)await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args)}});
 if(failed)await page.route(/\/audio\/.*\.(mp3|m4a)(?:\?|$)/,r=>r.abort());
 await page.goto(`${base}/scripts/fixtures/launch-briefing.html?at=${at}`);await page.waitForFunction(()=>window.filmReady);return page;
}
try{
 for(let i=0;i<3;i++){
  const at=MUSIC_START+score.accents[i]-SCORE_OFFSET-.65,page=await pageAt(at);
  await page.evaluate(({cue,expected})=>{window.cue=null;const root=player.root,clock=audioClocks[0];new MutationObserver(()=>{if(root.dataset.wordCount===String(expected)&&!window.cue)window.cue={actual:clock.currentTime,expected:scoreSource.when+cue-scoreSource.offset}}).observe(root,{attributes:true,attributeFilter:['data-word-count']});},{cue:score.accents[i],expected:i+1});
  await page.waitForFunction(()=>!!window.cue);const cue=await page.evaluate(()=>window.cue);assert.ok(Math.abs(cue.actual-cue.expected)<.09,JSON.stringify(cue));
  assert.equal(await page.locator('.launch-title .visible').count(),i+1);
  assert.equal(await page.locator(`[data-launch-word="${i}"]`).evaluate(el=>getComputedStyle(el).opacity),'1');
  console.log(`PASS title ${i+1} at musical accent; render delta ${Math.round((cue.actual-cue.expected)*1000)}ms`);await page.close();
 }
 const paused=await pageAt(MUSIC_START+3);
 await paused.evaluate(()=>{window.offsetBefore=scoreSource.offset;window.startsBefore=scoreStarts;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await paused.waitForTimeout(400);
 await paused.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await paused.waitForFunction(()=>scoreStarts>startsBefore);assert.ok(await paused.evaluate(()=>scoreSource.offset-offsetBefore<.2),'hidden interval must not advance the media position');await paused.close();
 const transition=await pageAt(STATIC_START);await transition.waitForFunction(()=>player.root.dataset.phase==='static');
 assert.ok(await transition.locator('.launch-briefing-static').evaluate(el=>+el.style.opacity)>.9);
 await transition.waitForFunction(()=>player.root.dataset.phase==='black');assert.equal(await transition.locator('.launch-briefing-static').isVisible(),false);
 await transition.waitForFunction(()=>player.root.dataset.phase==='outro');assert.equal(await transition.locator('.launch-title .visible').count(),0);await transition.close();
 const layouts=[['desktop',1440,900],['phone',320,700],['landscape',844,390],['ultrawide',2560,1080]];
 for(const [name,width,height] of layouts){const page=await pageAt(MUSIC_START+score.accents[2]-SCORE_OFFSET+2.2,{width,height});await page.locator('[data-briefing-proceed]').waitFor({state:'visible'});
  const aperture=await page.locator('.launch-film-frame').evaluate(el=>{const r=el.getBoundingClientRect();return r.width/r.height;});assert.ok(Math.abs(aperture-4/3)<.001,`${name} aperture must be4:3`);
  const fit=await page.locator('.launch-title').evaluate(el=>[...el.querySelectorAll('strong,button')].every(child=>{const r=child.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));assert.ok(fit,`${name} title clipping`);
  await page.screenshot({path:`work/launch-player/${name}.png`});
  if(name==='phone'){await page.locator('[data-briefing-proceed]').click();await page.waitForFunction(()=>window.proceeded===1);assert.equal(await page.locator('[data-launch-briefing]').count(),0);}else await page.evaluate(()=>player.dispose());await page.waitForFunction(()=>audioClocks.every(c=>c.state==='closed'));await page.close();
 }
 const fallback=await pageAt(filmTimeAt(36),{fallback:true,failed:true});assert.equal(await fallback.locator('.launch-briefing-fallback').isVisible(),true);
 await fallback.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));window.clockBefore=player.root.dataset.shot;});
 await fallback.locator('[data-briefing-skip]').click();assert.equal(await fallback.evaluate(()=>window.skipped),1);await fallback.waitForFunction(()=>audioClocks.every(c=>c.state==='closed'));await fallback.close();
 assert.deepEqual(errors,[]);console.log('PASS static → silent black → score; four viewport layouts; enter/skip cleanup; missing audio/WebGL fallback');
}finally{await browser.close()}
