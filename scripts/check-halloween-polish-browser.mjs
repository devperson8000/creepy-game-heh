import {previewPassword,localPreviewAccess} from './preview-browser-access.mjs';
import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFile,mkdir} from 'node:fs/promises';
const base=process.env.GAME_TEST_URL||'http://localhost:5174',mapOnly=process.env.POLISH_MAP_ONLY==='1',password=previewPassword();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1050,height:760}}),errors=[];
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
await page.addInitScript(()=>{if(!localStorage.getItem('monochrome.settings'))localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',volume:0,reducedMotion:true}));});
const shot=async name=>page.screenshot({path:`work/polish-shots/${name}.png`,timeout:15000});
let frame;
async function holdFor(test,arg){await frame.locator('canvas').first().focus();await page.keyboard.down('e');await localPreviewAccess(page,base);
try{await frame.waitForFunction(test,arg,{timeout:8000});}finally{await page.keyboard.up('e');}}
async function aimAt(id){await frame.evaluate(id=>{const g=monochrome,p=g.world.targets.get(id).mesh.getWorldPosition(g.camera.position.clone());g.ui.hideScreen();g.input.clear();g.input.setView(Math.atan2(g.player.x-p.x,g.player.z-p.z),Math.atan2(p.y-g.player.height-1.65,Math.hypot(p.x-g.player.x,p.z-g.player.z)));},id);await frame.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function back(){await page.getByRole('button',{name:'Back to tests',exact:true}).click();await page.locator('#halloween-test-frame').waitFor({state:'detached'});}
try{
 await mkdir('work/polish-shots',{recursive:true});
 if(!mapOnly){
  await page.goto(base);await page.locator('#lobby-singleplayer').waitFor();assert.match(await page.locator('.halloween-countdown').innerText(),/8:00 PM/);
  for(const width of [1050,390,320]){await page.setViewportSize({width,height:760});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width===390)await shot('countdown-mobile');}await page.setViewportSize({width:1050,height:760});
 }
 await page.goto(base+'/testhalloween');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Unlock tests'}).click();await page.locator('#halloween-test-hub').waitFor();
 if(!mapOnly){
  assert.equal(await page.getByRole('button',{name:'Opening house introduction',exact:true}).count(),1);
  await page.evaluate(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',volume:0,reducedMotion:false})));
  await page.getByRole('button',{name:'Opening house introduction',exact:true}).click();frame=page.frames().find(f=>f!==page.mainFrame());await frame.locator('.opening-canvas').waitFor({timeout:45000});await frame.locator('.opening-status').waitFor({state:'detached',timeout:45000});await shot('intro-private-preview');
  await frame.locator('.opening-skip').focus();await page.keyboard.down('Space');await page.waitForTimeout(700);await page.keyboard.up('Space');assert.equal(await frame.locator('.opening-sequence.is-title').count(),0);
  await page.keyboard.down('Space');await frame.locator('.opening-sequence.is-title').waitFor({timeout:10000});await page.keyboard.up('Space');await page.locator('.halloween-test-status').filter({hasText:'Test finished.'}).waitFor({timeout:15000});await back();
  await page.evaluate(()=>localStorage.setItem('monochrome.settings',JSON.stringify({quality:'low',volume:0,reducedMotion:true})));
 }
 console.log('Checking decorated maze and code');await page.getByRole('button',{name:'Test new gameplay',exact:true}).click();frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>window.monochrome&&!monochrome.ui.overlay,null,{timeout:45000});
 const density=await frame.evaluate(()=>({rooms:monochrome.run.layout.rooms.length,decorations:monochrome.world.halloween.placements.length,walls:monochrome.world.halloween.placements.filter(p=>p.surface==='wall').length,lights:monochrome.world.halloween.root.children.filter(o=>o.isPointLight).length}));assert.ok(density.decorations>density.rooms*5);assert.ok(density.walls>=18);assert.equal(density.lights,3);
 await frame.evaluate(()=>{const g=monochrome,r=g.renderer,render=r.render.bind(r);r.render=(scene,camera)=>{render(scene,camera);if(scene===g.world.scene)window.polishStats={calls:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries};};});
 await page.getByRole('button',{name:'Next drawer room',exact:true}).click();await frame.evaluate(()=>{const g=monochrome,r=g.run.layout.rooms[0],n=r.normal;Object.assign(g.player,{x:(r.x-8)*2.6+n.x*1.05,z:(r.z-8)*2.6+n.z*1.05});g.input.setView(Math.atan2(n.x,n.z),.035);g.input.clear();g.ui.hideScreen();});await page.waitForTimeout(300);await shot('decorated-drawer-room');
 await frame.evaluate(()=>{const g=monochrome,p=g.world.halloween.placements.find(p=>p.surface==='wall'&&p.kind==='lantern');Object.assign(g.player,{x:p.x+p.normal.x*.85,z:p.z+p.normal.z*.85,height:g.run.layout.floorHeight});g.ui.hideScreen();g.input.clear();g.input.setView(p.yaw,-.12);});await page.waitForTimeout(300);await shot('corridor-lantern');
 await frame.evaluate(()=>{const g=monochrome,r=g.run.layout.rooms[g.run.clueRoom],n=r.normal;Object.assign(g.player,{x:(r.x-8)*2.6+n.x*.65,z:(r.z-8)*2.6+n.z*.65,height:g.run.layout.floorHeight});});await aimAt('clue');await frame.getByText('Read the four-digit clue',{exact:true}).waitFor({timeout:8000});await holdFor(()=>monochrome.run.clueRead);await shot('readable-code');
 console.log('Map decoration metrics:',density,await frame.evaluate(()=>window.polishStats));await back();
 console.log('Checking every quest prop with E');await page.getByRole('button',{name:'Quest items',exact:true}).click();frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>window.monochrome,null,{timeout:45000});
 for(const [label,stage]of [['Invitation',0],['Seal 1',1],['Seal 2',2],['Seal 3',3],['Key chest',4]]){
  await page.getByRole('button',{name:label,exact:true}).click();await frame.waitForFunction(stage=>monochrome.run.halloween.stage===stage,stage);await frame.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(stage===1)await shot('pumpkin-seal');if(stage===2)await shot('skeleton-seal');await holdFor(stage=>monochrome.run.halloween.stage===stage+1,stage);
 }
 await frame.waitForTimeout(1200);await shot('chest-key-reveal');assert.equal(await frame.evaluate(()=>monochrome.run.halloween.key),true);await back();assert.deepEqual(errors,[]);console.log(mapOnly?'PASS decorated maze, readable code and all quest interactions with E.':'PASS Halloween atmosphere, readable code, real quest interactions, private introduction/skip and mobile presentation.');
}finally{await browser.close();}
