import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.GAME_TEST_URL||'http://localhost:5182',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage({viewport:{width:640,height:480}}),errors=[],sequelRequests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/needlelimbs\.glb|sfx\/needle-breath/.test(r.url()))sequelRequests.push(r.url());});
await page.addInitScript(()=>{localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',reducedMotion:true,volume:0}));window.metalPlates=0;window.spatialPanners=0;const plate=AudioContext.prototype.createConvolver,panner=AudioContext.prototype.createPanner;AudioContext.prototype.createConvolver=function(...args){metalPlates++;return plate.apply(this,args);};AudioContext.prototype.createPanner=function(...args){spatialPanners++;return panner.apply(this,args);};});
try{
 for(const mode of ['solo','coop','menu']){
  await page.goto(base+'/scripts/fixtures/halloween-monster-scope.html');
  const result=await page.evaluate(async mode=>{
   const container=document.querySelector('#scene');
   if(mode==='menu'){
    const {startMenuHallway}=await import('/src/menu-hallway.js');window.menu=startMenuHallway(container);
    if(!window.menuScene)throw Error('Menu scene was not constructed');
    const sequel=!!menuScene.getObjectByName('monochrome-mechanical-head');menu.dispose();return {sequel};
   }
   let g;
   if(mode==='solo'){const {startGame}=await import('/src/game.js');g=startGame(container,{seed:42,halloween:true});}
   else{const {startCoopGame}=await import('/src/coop-game.js'),client={id:'host',send:()=>true,subscribe:()=>()=>{},close:async()=>{}};g=startCoopGame(container,{client,session:{seed:42,ownerId:'host',halloween:true,players:[{id:'host',slot:0},{id:'friend',slot:1}]}});g.arrival.dispose();}
   g.renderer.render=()=>{};window.game=g;
   const result={seasonal:!!g.run.halloween,sequel:!!g.world.scene.getObjectByName('monochrome-mechanical-head'),scareSequel:!!g.jumpscare.face.getObjectByName('monochrome-mechanical-head'),organicHorns:g.jumpscare.face.children.filter(o=>o.geometry?.type==='TubeGeometry'&&o.visible).length};
   await g.monsterAudio.resume();g.monsterAudio.playJumpscare();g.jumpscare.start();g.jumpscare.update(.1);result.metalPlates=metalPlates;result.spatialPanners=spatialPanners;g.monsterAudio.dispose();g.renderer.setAnimationLoop(null);return result;
  },mode);
  assert.equal(result.sequel,false,mode+' retains original Monochrome');
  if(mode!=='menu'){assert.equal(result.seasonal,true);assert.equal(result.scareSequel,false);assert.equal(result.organicHorns,2);assert.equal(result.metalPlates,0,'roaming and jumpscare audio do not create the sequel metallic plate');assert.ok(result.spatialPanners>=1,'original recording keeps directional maze sound');}
  console.log('PASS original Monochrome scope:',mode,result);
 }
 assert.deepEqual(sequelRequests,[],'gameplay never loads Needlelimbs or its breaths');assert.deepEqual(errors,[]);
}finally{await browser.close();}
