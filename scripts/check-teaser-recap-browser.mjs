import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const base=process.env.GAME_TEST_URL||'http://localhost:5175',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.locator('#lobby-singleplayer').waitFor();await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js'),{createTeaserPlayback}=await import('/src/teaser-playback.js');
  document.body.replaceChildren();document.body.style.margin=0;const renderer=new T.WebGLRenderer();renderer.setSize(960,540);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
  const p=createTeaserPlayback({preview:true});await p.scene.ready;window.recap=p;window.recapRenderer=renderer;
  const screen=new T.Scene(),camera=new T.OrthographicCamera(-8,8,4.5,-4.5,.1,10);camera.position.z=2;screen.add(new T.Mesh(new T.PlaneGeometry(16,9),new T.MeshBasicMaterial({map:p.scene.target.texture,toneMapped:false})));
  window.showRecap=time=>{p.scene.render(renderer,time,{quality:'low',reducedMotion:true});renderer.render(screen,camera);return p.sample(time);};
 });
 await mkdir('work/story-shots',{recursive:true});
 for(const [time,label]of [[.8,'previously'],[7.7,'recap-dive'],[10.8,'recap-sever'],[13.7,'recap-head'],[18,'teaser-after-recap'],[33,'repaired-head']]){
  const f=await page.evaluate(time=>showRecap(time),time);await page.screenshot({path:`work/story-shots/${label}.png`});console.log(label,f.shot);
 }
 assert.equal(await page.evaluate(()=>recap.scene.historical.creature.root.getObjectByName('monochrome-mechanical-head')!==undefined),false);
 assert.equal(await page.evaluate(()=>recap.sample(.5).subtitle),'PREVIOUSLY…');assert.equal(await page.evaluate(()=>recap.sample(18).time),3);
 await page.evaluate(()=>{recap.audio.update(0,{muted:true,volume:.5});recap.audio.update(18,{muted:true,volume:.5});recap.audio.pause();recap.audio.dispose();recap.scene.dispose();recap.scene.dispose();recapRenderer.dispose();});assert.deepEqual(errors,[]);console.log('PASS real recap render, original head, no walkout, teaser handoff and disposal.');
}finally{await browser.close();}
