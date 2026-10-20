import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const password=process.env.HALLOWEEN_TEST_PASSWORD||await readFile('work/halloween-preview-password.txt','utf8');
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true}));
 const NativeAudio=window.Audio;window.testAudio=[];window.testPlays=[];
 window.Audio=function(...args){const a=new NativeAudio(...args);testAudio.push(a);const play=a.play.bind(a);a.play=()=>{testPlays.push({src:a.src,at:performance.now(),offset:a.currentTime});return play();};return a;};window.Audio.prototype=NativeAudio.prototype;
 window.testGains=[];const C=window.AudioContext,gain=C.prototype.createGain;C.prototype.createGain=function(){const g=gain.call(this),set=g.gain.setTargetAtTime.bind(g.gain);g.gain.setTargetAtTime=(v,...rest)=>{g.lastTarget=v;return set(v,...rest);};testGains.push(g);return g;};const create=C.prototype.createBufferSource;window.testBufferPlays=[];const ids=new WeakMap();let next=0;
 C.prototype.createBufferSource=function(){const source=create.call(this),start=source.start.bind(source);source.start=(when=0,offset=0)=>{if(source.buffer){if(!ids.has(source.buffer))ids.set(source.buffer,++next);testBufferPlays.push({id:ids.get(source.buffer),duration:source.buffer.duration,when,offset});}return start(when,offset);};return source;};
});
async function unlock(){await page.goto(process.env.GAME_TEST_URL||'http://localhost:5173');await page.getByRole('button',{name:'Test Halloween Gameplay',exact:true}).click();const d=page.getByRole('dialog',{name:'Halloween test access'});await d.getByLabel('Password',{exact:true}).fill(password);await d.getByRole('button',{name:'Unlock tests'}).click();await page.locator('#halloween-test-hub').waitFor();}
const frame=()=>page.frames().find(f=>f!==page.mainFrame());
try{
 await unlock();await page.getByRole('button',{name:'B2 encounter',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow.monochrome?.run.halloween.visit?.stage==='conversation',null,{timeout:40000});
 const f=frame();await f.waitForFunction(()=>monochrome.experience.teaser.survivor);
 // Skip only the already-tested intro; the entire new film plays at real speed.
 const start=Date.now();await f.evaluate(()=>{const v=monochrome.run.halloween.visit;v.startedAt=Date.now()/1000-10;window.testPlays=[];});
 for(const [shot,minimum] of [['arrival',0],['door',5],['mimic',11],['chase',17],['title',21]]){
  await f.waitForFunction(shot=>monochrome.experience.teaser.state.shot===shot,shot,{timeout:12000});
  assert.equal(await f.evaluate(()=>monochrome.run.halloween.seen),false);
  if(shot==='mimic'){await f.waitForFunction(()=>monochrome.experience.teaser.mouth.visible);assert.match(await f.evaluate(()=>monochrome.experience.teaser.mouth.material.map.image.src),/jumpscare-mouth.png$/);}
  if(shot==='title')assert.ok(Date.now()-start>=minimum*1000-500);
 }
 await f.waitForFunction(()=>document.querySelector('.b2-subtitle')?.textContent.includes('Now you know'),null,{timeout:8000});
 const help=await f.evaluate(()=>testBufferPlays.filter(p=>p.duration>1.75&&p.duration<1.95));assert.equal(help.length,2);assert.equal(help[0].id,help[1].id);assert.ok(Math.abs(help[1].when-help[0].when-5.5)<.05);
 await f.waitForFunction(()=>!monochrome.experience.stranger.visible,null,{timeout:7000});
 await f.waitForFunction(()=>monochrome.run.halloween.seen&&monochrome.run.halloween.visit.stage==='archive',null,{timeout:7000});assert.ok(Date.now()-start>=32500,'outro must complete');
 assert.equal(await f.evaluate(()=>{let screen;monochrome.experience.scene.traverse(o=>{if(o.isMesh&&Math.abs(o.position.z+1.94)<.001)screen=o;});return screen?.material.color.getHex();}),0,'the monitor stays dead after the stranger leaves');
 console.log('PASS full 25s film, shared encounter deadline, identical repeated voice, actual jumpscare mouth, stranger outro and disappearance.');
 await page.getByRole('button',{name:'Back to tests',exact:true}).click();
 // Test the actual replay entry and disposal rather than a public debug URL.
 await page.getByRole('button',{name:'Monochrome II teaser',exact:true}).click();
 await frame().locator('.b2-overlay:not([hidden])').waitFor({timeout:30000});
 await frame().getByRole('button',{name:'Sound on · M'}).click();
 await frame().getByRole('button',{name:'Sound off · M'}).waitFor();
 assert.ok(await frame().evaluate(()=>testAudio.filter(a=>/halloween/.test(a.src)).every(a=>a.muted)));assert.ok(await frame().evaluate(()=>testGains.some(g=>g.lastTarget===0)));await page.locator('#halloween-test-frame').screenshot({path:'work/teaser-replay-desktop.png'});
 for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await frame().evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#halloween-test-frame').screenshot({path:`work/teaser-replay-mobile-${width}.png`});}
 await frame().locator('.b2-overlay').waitFor({state:'detached',timeout:30000});assert.deepEqual(await frame().evaluate(()=>testPlays.filter(p=>p.src.includes('/stranger-'))),[],'replay must hold the title without entering the B2 outro');
 await page.getByRole('button',{name:'Replay test',exact:true}).click();await frame().locator('.b2-overlay:not([hidden])').waitFor({timeout:30000});
 await page.getByRole('button',{name:'Back to tests',exact:true}).click();assert.equal(await page.locator('iframe').count(),0);
 await page.route('**/models/hazmat-survivor.glb',route=>route.abort());await page.getByRole('button',{name:'Monochrome II teaser',exact:true}).click();await frame().getByRole('alert').getByText('Tape could not load. Return to the menu and try again.').waitFor({timeout:30000});await page.unroute('**/models/hazmat-survivor.glb');
 await page.getByRole('button',{name:'Back to tests',exact:true}).click();await page.getByRole('button',{name:'Return to main menu',exact:true}).click();await page.locator('#lobby-singleplayer').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS replay, mute, reduced motion, portrait layouts, failed asset handling and repeated teardown; no browser exceptions.');
}catch(e){console.error(e);console.log(errors);console.log(await frame()?.evaluate(()=>({plays:window.testPlays,bufferPlays:window.testBufferPlays,visit:window.monochrome?.run.halloween.visit})).catch(()=>null));await page.screenshot({path:'work/teaser-test-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
