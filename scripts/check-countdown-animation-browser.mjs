import {OPENING_DURATION,OPENING_TITLE_AT} from '../src/opening-sequence.js';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {HALLOWEEN_DEADLINE,releaseStatus} from '../src/halloween-release-time.js';

const base=process.env.GAME_TEST_URL||'http://localhost:5186';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),errors=[];
await mkdir('work/countdown-animation',{recursive:true});
async function context({seconds=309,width=1440,reduced=false,confirmed=true,volume=.8}={}){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:reduced?'reduce':'no-preference'});
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.addInitScript(({reduced,volume})=>{
  try{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',volume,reducedMotion:reduced}));}catch{}
  window.countdownContexts=[];const Original=window.AudioContext;
  if(Original)window.AudioContext=class extends Original{constructor(...args){super(...args);countdownContexts.push(this);this.startedTones=0;this.ownedGains=[];}createOscillator(){const source=super.createOscillator(),start=source.start;source.start=(...args)=>{this.startedTones++;return start.apply(source,args);};return source;}createGain(){const node=super.createGain();this.ownedGains.push(node);return node;}};
 },{reduced,volume});
 const page=await context.newPage();
 const start=HALLOWEEN_DEADLINE-(seconds+1)*1000;
 await page.clock.install({time:new Date(start)});await page.clock.pauseAt(new Date(start+1000));
 await page.route('**/api/halloween-release',async route=>confirmed?route.fulfill({json:releaseStatus(await page.evaluate(()=>Date.now()))}):route.abort());
 const delivered=confirmed?page.waitForResponse(r=>r.url().endsWith('/api/halloween-release')&&r.status()===200):null;
 await page.goto(base);await page.locator('.halloween-countdown').waitFor();
 if(delivered)await (await delivered).finished();await page.clock.runFor(300);
 return {context,page};
}
async function finishOpeningIfPresent(page){await page.locator('.opening-sequence,#lobby-singleplayer').first().waitFor();if(await page.locator('.opening-sequence').count()){await page.keyboard.down('Space');await page.clock.runFor(2200);await page.keyboard.up('Space');await page.clock.runFor((OPENING_DURATION-OPENING_TITLE_AT+1)*1000);}await page.locator('#lobby-singleplayer').waitFor();}
try{
 const {context:desktop,page}=await context();
 await page.waitForFunction(()=>document.querySelector('.halloween-countdown').dataset.countdownPhase==='idle');
 assert.equal(await page.locator('.map-countdown').count(),0);assert.equal(await page.locator('#halloween-timer-view').isVisible(),false);
 await page.locator('[data-countdown-open]').click({force:true});
 await page.locator('#halloween-timer-view').waitFor({state:'visible'});
 assert.equal(await page.locator('.halloween-timer-readout').innerText(),'05:09');
 assert.equal(await page.locator('#lobby-menu').evaluate(el=>el.inert),true);
 const native=await page.evaluate(()=>document.fullscreenEnabled);
 if(native)await page.waitForFunction(()=>document.fullscreenElement?.id==='halloween-timer-view');
 await page.locator('[data-countdown-close]').click({force:true});
 await page.waitForFunction(()=>!document.fullscreenElement);
 assert.equal(await page.locator('#lobby-menu').evaluate(el=>el.inert),false);
 await page.waitForFunction(()=>document.activeElement?.matches('[data-countdown-open]'),null,{timeout:2000});
 await page.clock.fastForward(10000);await page.clock.runFor(100);
 assert.equal(await page.locator('.halloween-countdown').getAttribute('data-countdown-phase'),'approaching');
 await page.locator('.halloween-countdown [data-countdown-sound]').click({force:true});
 await page.waitForFunction(()=>countdownContexts.some(c=>c.state==='running'));
 await page.clock.fastForward(240000);await page.clock.runFor(100);
 assert.equal(await page.locator('.halloween-countdown').getAttribute('data-countdown-phase'),'urgent');
 assert.equal(await page.locator('#halloween-timer-view').isVisible(),false);
 await page.clock.fastForward(30000);await page.clock.runFor(100);
 await page.locator('#halloween-timer-view').waitFor({state:'visible'});
 assert.equal(await page.locator('#halloween-timer-view').getAttribute('data-phase'),'final');
 assert.equal(await page.evaluate(()=>document.fullscreenElement),null,'automatic immersive view must not request native fullscreen without a gesture');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('#halloween-timer-view')),true);
 await page.screenshot({path:'work/countdown-animation/desktop-final.png'});
 await page.waitForFunction(()=>countdownContexts.some(c=>c.startedTones>0));
 const beforeHidden=await page.evaluate(()=>countdownContexts.map(c=>c.startedTones));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.clock.runFor(2000);
 assert.deepEqual(await page.evaluate(()=>countdownContexts.map(c=>c.startedTones)),beforeHidden);
 assert.ok(await page.evaluate(()=>countdownContexts.every(c=>c.ownedGains[0].gain.value===0)),'hidden tab silences the owned audio bus');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 const audioBefore=await page.evaluate(()=>countdownContexts.map(c=>c.startedTones));
 await page.locator('#halloween-timer-view [data-countdown-sound]').click({force:true});
 assert.equal(await page.locator('#halloween-timer-view [data-countdown-sound]').getAttribute('aria-pressed'),'false');
 await page.clock.runFor(2000);assert.deepEqual(await page.evaluate(()=>countdownContexts.map(c=>c.startedTones)),audioBefore,'mute stops new heartbeat sources');
 await page.clock.fastForward(30000);await page.clock.runFor(100);
 assert.equal(await page.locator('.halloween-timer-readout').innerText(),'00:00');
 assert.equal(await page.locator('#halloween-timer-view').getAttribute('data-phase'),'complete');
 await page.locator('[data-briefing-skip]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-launch-briefing]').evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.halloween-timer-footer').getBoundingClientRect().top),true);
 await page.locator('[data-briefing-skip]').click({force:true});
 assert.equal(await page.locator('[data-countdown-refresh]').isVisible(),true);
 assert.equal(await page.evaluate(()=>document.activeElement?.matches('[data-countdown-refresh]')),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#halloween-timer-view').isVisible(),false);
 await page.reload();await page.clock.runFor(100);await finishOpeningIfPresent(page);
 assert.equal(await page.locator('#halloween-timer-view').isVisible(),false,'no repeated automatic view after reload at zero');
 await page.clock.runFor(1000);
 await page.locator('.halloween-countdown [data-briefing-watch]').click({force:true});
 await page.locator('[data-launch-briefing]').waitFor({state:'visible'});
 await page.locator('#halloween-timer-view [data-countdown-sound]').click();
 assert.equal(await page.locator('#halloween-timer-view [data-countdown-sound]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-briefing-skip]').click();
 await page.locator('[data-countdown-close]').click();
 // Leaving the choice screen must remove the timer and every owned audio resource.
 await page.evaluate(()=>window.launchAudioBeforeGame=[...countdownContexts]);
 await page.locator('#lobby-singleplayer').click({force:true});await page.waitForFunction(()=>!!window.monochrome);
 assert.equal(await page.locator('#halloween-timer-view').count(),0);assert.equal(await page.evaluate(()=>document.body.classList.contains('halloween-timer-open')),false);
 await page.waitForFunction(()=>launchAudioBeforeGame.every(c=>c.state==='closed'));
 await desktop.close();console.log('PASS confirmed phases, manual/native fullscreen, automatic focus, mute, zero, replay guard and gameplay disposal');

 const {context:background,page:hidden}=await context({seconds:40});
 await hidden.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await hidden.clock.fastForward(15000);await hidden.clock.runFor(100);
 assert.equal(await hidden.locator('#halloween-timer-view').isVisible(),false,'a hidden tab must not open a dialog or steal focus');
 await hidden.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await hidden.locator('#halloween-timer-view').waitFor({state:'visible'});
 await hidden.reload();await hidden.clock.runFor(300);assert.equal(await hidden.locator('#halloween-timer-view').isVisible(),false,'reload before zero does not repeat the automatic view');await background.close();

 const {context:crossing,page:cross}=await context({seconds:2});
 await cross.locator('#halloween-timer-view').waitFor({state:'visible'});
 await cross.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await cross.clock.fastForward(3000);await cross.clock.runFor(100);
 await cross.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await cross.clock.runFor(200);assert.equal(await cross.locator('[data-launch-briefing]').count(),0,'returning across zero must not force a film');await crossing.close();

 const {context:phone,page:mobile}=await context({seconds:20,width:390,reduced:true,volume:0});
 await mobile.locator('#halloween-timer-view').waitFor({state:'visible'});
 await mobile.locator('#halloween-timer-view [data-countdown-sound]').click({force:true});await mobile.clock.runFor(1000);
 assert.ok(await mobile.evaluate(()=>countdownContexts.length>0&&countdownContexts.every(c=>c.startedTones===0&&c.ownedGains[0].gain.value===0)),'saved zero volume silences all timer effects');
 for(const width of [390,320]){
  await mobile.setViewportSize({width,height:844});
  const fit=await mobile.evaluate(()=>{const view=document.querySelector('#halloween-timer-view'),readout=view.querySelector('.halloween-timer-readout'),r=readout.getBoundingClientRect();return{overflow:view.scrollWidth>view.clientWidth,inside:r.left>=0&&r.right<=innerWidth,animation:getComputedStyle(readout).animationName};});
  assert.equal(fit.overflow,false);assert.equal(fit.inside,true);assert.equal(fit.animation,'none');
 }
 await mobile.screenshot({path:'work/countdown-animation/phone-final.png'});
 await mobile.clock.fastForward(22000);await mobile.clock.runFor(100);
 await mobile.locator('[data-launch-briefing]').waitFor({state:'visible'});
 assert.equal(await mobile.locator('[data-launch-briefing]').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=document.querySelector('.halloween-timer-header').getBoundingClientRect().bottom&&r.bottom<=document.querySelector('.halloween-timer-footer').getBoundingClientRect().top}),true);
 await mobile.locator('[data-briefing-skip]').click();
 await mobile.locator('[data-countdown-close]').click({force:true});await mobile.reload();await mobile.clock.runFor(100);await finishOpeningIfPresent(mobile);
 assert.equal(await mobile.locator('#halloween-timer-view').isVisible(),false,'dismissed event stays dismissed after recreating the menu');
 await phone.close();console.log('PASS reduced motion, phone fitting and persisted dismissal');

 const {context:unknown,page:unconfirmed}=await context({seconds:-5,confirmed:false});
 await unconfirmed.clock.fastForward(5000);
 assert.equal(await unconfirmed.locator('#halloween-timer-view').isVisible(),false);
 assert.equal(await unconfirmed.locator('.halloween-countdown.is-complete').count(),0);
 await unknown.close();assert.deepEqual(errors,[]);console.log('PASS unconfirmed clocks cannot announce release or open the timer; no runtime errors');
}catch(error){for(const context of browser.contexts())for(const page of context.pages())console.error('Countdown browser state',await page.evaluate(()=>({focus:document.activeElement?.outerHTML?.slice(0,180),fullscreen:document.fullscreenElement?.id,phase:document.querySelector('.halloween-countdown')?.dataset.countdownPhase,dialogPhase:document.querySelector('#halloween-timer-view')?.dataset.phase,hidden:document.querySelector('#halloween-timer-view')?.hidden,now:Date.now()})).catch(()=>null));throw error;}finally{await browser.close();}
