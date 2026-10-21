import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.GAME_TEST_URL||'http://localhost:5173';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${base}/scripts/fixtures/needlelimbs-preparation.html`);await page.waitForFunction(()=>window.ready);
 await mkdir('docs/assets/mechanical-monochrome',{recursive:true});
 for(const angle of ['front','side','body']){await page.evaluate(angle=>showHead(angle),angle);await page.screenshot({path:`docs/assets/mechanical-monochrome/${angle}.png`});}
 const film=await page.evaluate(()=>showFilm(18.3));assert.match(film.error,/pending/);assert.equal(film.state.shot,'rebuilt');await page.screenshot({path:'work/needlelimbs-rebuilt-scene.png'});
 const opening=await page.evaluate(async()=>{
  const {playOpeningBeforeMenu}=await import('/src/opening-sequence.js');let completed=0,disposed=0,release;
  const wait=new Promise(resolve=>{release=resolve;});
  const opening=playOpeningBeforeMenu({container:document.body,onComplete:()=>completed++,createFilm:async()=>{await wait;return {ready:Promise.resolve(),render(){},dispose(){disposed++;}};}});
  document.querySelector('.opening-skip').click();release();await new Promise(resolve=>setTimeout(resolve,50));opening.dispose();
  return {completed,disposed,remaining:document.querySelectorAll('.opening-sequence').length};
 });assert.deepEqual(opening,{completed:1,disposed:1,remaining:0},'skip during loading still disposes the arriving film and opens exactly one menu');
 await page.evaluate(async()=>{
  const C=window.AudioContext,create=C.prototype.createBufferSource,createGain=C.prototype.createGain;window.plays=[];window.gains=[];window.stops=0;
  C.prototype.createGain=function(){const g=createGain.call(this),set=g.gain.setTargetAtTime.bind(g.gain);g.gain.setTargetAtTime=(v,...args)=>{g.lastTarget=v;return set(v,...args);};gains.push(g);return g;};
  C.prototype.createBufferSource=function(){const source=create.call(this),start=source.start.bind(source),stop=source.stop.bind(source);source.start=(when=0,offset=0)=>{plays.push({duration:source.buffer.duration,when,offset});return start(when,offset);};source.stop=(...args)=>{stops++;return stop(...args);};return source;};
  const {createTeaserAudio}=await import('/src/teaser-audio.js'),t=await import('/src/needlelimbs-timeline.js');
  window.audio=createTeaserAudio({voices:t.NEEDLELIMBS_VOICES,soundCues:t.NEEDLELIMBS_SOUND_CUES,monsterCue:t.NEEDLELIMBS_MONSTER_CUE});audio.update(4.6);
 });
 await page.waitForFunction(()=>plays.some(s=>s.duration>3.1&&s.duration<3.5));
 const reply=await page.evaluate(()=>plays.find(s=>s.duration>3.1&&s.duration<3.5));assert.ok(reply.offset>=.49&&reply.offset<2);
 const stopped=await page.evaluate(()=>{const before=stops;audio.pause();return stops-before;});assert.ok(stopped>=2,'pause cancels dialogue and future monster audio');
 await page.evaluate(()=>audio.update(8.2,{muted:true}));await page.waitForFunction(()=>gains.some(g=>g.lastTarget===0));await page.evaluate(()=>{audio.dispose();audio.dispose();});
 await page.addInitScript(()=>localStorage.setItem('monochrome.recovered-footage.2026','1'));
 await page.goto(base);await page.locator('#lobby-singleplayer').waitFor();assert.equal(await page.getByRole('button',{name:'Recovered footage / Tape 02',exact:true}).count(),0);
 assert.equal(await page.locator('.opening-sequence').count(),0,'unwritten intro does not obstruct the menu');
 for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.deepEqual(errors,[]);console.log('PASS: mechanical head previews, staged scene, no fake Needlelimbs fallback, loading/skip cleanup, actual reply audio, mute, cancellation, removed replay button, desktop/390/320px menu and no browser exceptions.');
}finally{await browser.close();}
