import {createTeaserScene} from './teaser-scene.js';
import {createTeaserAudio} from './teaser-audio.js';
import {TEASER_START,TEASER_END,sampleTeaser} from './teaser-timeline.js';
import {createHalloweenAudio} from './halloween-audio.js';
import * as THREE from 'three';
import {gamePreferences,reducedMotion} from './preferences.js';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {halloweenClue} from './halloween-state.js';
export const FOOTAGE_KEY='monochrome.recovered-footage.2026';
export function hasRecoveredFootage(){try{return localStorage.getItem(FOOTAGE_KEY)==='1';}catch{return false;}}
export function rememberFootage(){try{localStorage.setItem(FOOTAGE_KEY,'1');}catch{}}

// Authored placeholder: the selected Ikk1 Hooded Wanderer requires its source GLB.
function hoodedStranger(){
 const root=new THREE.Group(),cloth=new THREE.MeshStandardMaterial({color:0x070709,roughness:.96}),voidMat=new THREE.MeshBasicMaterial({color:0x000000});
 function part(geo,mat,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);root.add(m);return m;}
 const points=[new THREE.Vector2(.58,0),new THREE.Vector2(.5,.35),new THREE.Vector2(.43,.85),new THREE.Vector2(.38,1.28),new THREE.Vector2(.29,1.47)];
 const cape=new THREE.LatheGeometry(new THREE.SplineCurve(points).getPoints(32),96),vertices=cape.attributes.position;
 for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),fold=1+.055*Math.cos(Math.atan2(x,z)*12)*Math.max(0,1-y/1.5);vertices.setXYZ(i,x*fold,y,z*fold);}cape.computeVertexNormals();part(cape,cloth,0,0,0);
 const hood=part(new THREE.SphereGeometry(.37,48,32,0,Math.PI*2,0,Math.PI*.86),cloth,0,1.68,0);hood.scale.set(1,1.2,1);
 part(new THREE.SphereGeometry(.29,40,24),voidMat,0,1.66,.2).scale.set(.87,1.08,.42);
 for(const side of [-1,1]){const arm=part(new THREE.CapsuleGeometry(.105,.53,8,20),cloth,side*.36,1.03,.23);arm.rotation.x=-.65;arm.rotation.z=side*.15;if(side===-1)root.userData.leftArm=arm;const hand=part(new THREE.SphereGeometry(.105,20,16),cloth,side*.34,.79,.44);hand.scale.set(.85,.7,1.3);if(side===-1)root.userData.leftHand=hand;}
 root.position.set(.55,.06,-3);return root;
}
export function createHalloweenExperience({renderer,camera,run,input,ui,players=()=>[],localId='solo',onReturn=()=>{},onMute=()=>{},isMuted=()=>false,poseFor=p=>p,replay=false}){
 if(!run.halloween)return {render:()=>false,finish(){},dispose(){}};
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x030405);scene.fog=new THREE.FogExp2(0x050607,.065);
 const resources=new Set(),root=new THREE.Group();scene.add(root);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.88,...extra});resources.add(m);return m;};
 const concrete=mat(0x333532),metal=mat(0x181d1e),paper=mat(0xb5ab8d),orange=mat(0x6e361b),screenMaterial=new THREE.MeshBasicMaterial({toneMapped:false});resources.add(screenMaterial);
 function box(w,h,d,x,y,z,m=metal){const g=new THREE.BoxGeometry(w,h,d);resources.add(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);root.add(mesh);return mesh;}
 box(8,.18,8.4,0,-.1,.2,concrete);box(8,3.5,.15,0,1.7,-4,concrete);box(.15,3.5,8.4,-4,1.7,.2,concrete);box(.15,3.5,8.4,4,1.7,.2,concrete);box(8,.15,8.4,0,3.5,.2,metal);box(8,3.5,.15,0,1.7,4.4,metal);
 box(3,.14,1.25,0,.9,-1.7);for(const x of [-1.3,1.3])box(.09,.9,1,x,.45,-1.7);
 for(const x of [-3.35,3.35]){for(const y of [.4,1.1,1.8,2.5]){box(1.05,.06,2.1,x,y,-2.3);for(let i=0;i<5;i++)box(.12,.28,.25,x-.38+i*.18,y+.16,-2.3, i%2?paper:orange);}for(const z of [-3.3,-1.3])box(.06,2.6,.06,x,.1+1.3,z);}
 for(let i=0;i<15;i++){const p=box(.22,.005,.29,Math.sin(i*2.4)*2.8,.01,Math.cos(i*1.7)*2.3,paper);p.rotation.y=i*2.1;}
 box(1.55,1.04,.24,-.65,1.57,-2.07);box(1.35,.79,.015,-.65,1.6,-1.94,screenMaterial);box(.32,.3,.25,-.65,1.04,-2.1);
 const stranger=hoodedStranger();root.add(stranger);
 const rim=new THREE.PointLight(0x75938f,3.5,4);rim.position.set(1.3,2.7,-3.5);scene.add(rim);
 const ambient=new THREE.HemisphereLight(0x95a4ac,0x15100b,.65);scene.add(ambient);
 const lamp=new THREE.PointLight(0xf2a55c,10,8,2);lamp.position.set(-2.7,2.7,-1);scene.add(lamp);box(.3,.06,.3,-2.7,2.9,-1,mat(0xffd6a1,{emissive:0xff8e39,emissiveIntensity:1}));
 const crt=new THREE.PointLight(0x8ebbb3,3.5,5);crt.position.set(0,1.6,-1.6);scene.add(crt);
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=448;const ctx=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;resources.add(texture);screenMaterial.map=texture;
 const doorLeft=box(1.15,2.8,.12,-.58,1.4,4.25),doorRight=box(1.15,2.8,.12,.58,1.4,4.25);
 const overlay=document.createElement('section');overlay.className='b2-overlay';overlay.hidden=true;overlay.innerHTML='<div class="b2-top"><div><small>RESTRICTED SERVICE ACCESS</small><strong>B2 / THE ARCHIVE</strong></div><button class="b2-mute">Sound on · M</button></div><div class="b2-letterbox"></div><p class="b2-subtitle" aria-live="polite"></p><div class="b2-fade"></div><div class="b2-bottom"><p class="b2-hint"></p><button class="b2-return" hidden>Return to B1</button></div>';
 document.body.append(overlay);const el=s=>overlay.querySelector(s),sub=el('.b2-subtitle'),fade=el('.b2-fade'),hint=el('.b2-hint'),returnButton=el('.b2-return');returnButton.onclick=()=>{renderer.domElement.focus();onReturn();};el('.b2-mute').onclick=()=>{onMute();score.resume();renderer.domElement.focus();};
 const score=createHalloweenAudio(),teaserScene=createTeaserScene(),teaserAudio=createTeaserAudio();
 const resumeScore=()=>{score.resume();teaserAudio.resume();};renderer.domElement.addEventListener('pointerdown',resumeScore);
 const voices=['knows','watch','leave'].map(name=>new Audio(`/audio/halloween/stranger-${name}.mp3`));voices.forEach(a=>{a.preload='auto';});
 const visibility=()=>{if(document.hidden){voices.forEach(a=>a.pause());score.pause();teaserAudio.pause();}};document.addEventListener('visibilitychange',visibility);
 const avatars=new Map();let asset,disposed=false;void loadPlayerAvatarAsset().then(a=>{if(!disposed)asset=a;}).catch(()=>{});
 let active=false,stageKey='',recordElapsed=-1,recordAt=0,audioPlayed=new Set(),interactHeld=false;
 let lastMonitorFrame=null;
 function monitor(t,playing,hold=false,dead=false){
  screenMaterial.color.setHex(dead?0x000000:0xffffff);
  if((playing||hold)&&!teaserScene.error){screenMaterial.map=teaserScene.target.texture;teaserScene.render(renderer,hold?24:t,{reducedMotion:reducedMotion(),quality:gamePreferences().quality});return;}
  screenMaterial.map=texture;
  const frame=dead?'dead':teaserScene.error?'error':'idle';if(frame===lastMonitorFrame)return;lastMonitorFrame=frame;
  if(dead){ctx.fillStyle='#000';ctx.fillRect(0,0,768,448);texture.needsUpdate=true;return;}
  ctx.fillStyle='#06100f';ctx.fillRect(0,0,768,448);ctx.fillStyle='#5b7770';ctx.font='22px monospace';ctx.fillText('ARCHIVE / TAPE 02',55,80);ctx.font='16px monospace';ctx.fillText(teaserScene.error?'TAPE UNAVAILABLE / TRY REPLAY':'NO LIVE SIGNAL',55,119);
  ctx.fillStyle='rgba(0,0,0,.22)';for(let y=0;y<448;y+=4)ctx.fillRect(0,y,768,1);texture.needsUpdate=true;
 }
 function finish(){if(!active)return;active=false;overlay.hidden=true;ui.root.hidden=false;ui.overlay=null;input.clear();const own=players().find(p=>(p.id??'solo')===localId);if(own)input.setView(own.yaw??Math.PI,own.pitch??0);document.body.classList.remove('b2-active');voices.forEach(a=>a.pause());score.pause();teaserAudio.pause();}
 function render(delta){
  const q=run.halloween,v=q?.visit;if(!v){finish();return false;}
  if(!active){active=true;overlay.hidden=false;input.clear();score.resume();teaserAudio.resume();document.body.classList.add('b2-active');}
  const cinematic=v.stage!=='archive',key=`${v.id}:${v.stage}:${v.startedAt}`;
  if(key!==stageKey){stageKey=key;recordElapsed=-1;voices.forEach(a=>a.pause());teaserAudio.pause();audioPlayed=new Set();input.clear();if(v.stage==='archive'){const own=players().find(p=>(p.id??'solo')===localId);input.setView(own?.yaw??0,own?.pitch??0);}if(cinematic){document.exitPointerLock?.();}}
  ui.overlay=cinematic?'halloween':null;
  // Keep touch controls available in the archive; all normal objectives remain hidden by CSS.
  ui.root.hidden=cinematic;overlay.classList.toggle('cinematic',cinematic);
  el('.b2-mute').textContent=isMuted()?'Sound off · M':'Sound on · M';
  const prefs=gamePreferences();voices.forEach(a=>{a.muted=isMuted()||document.hidden;a.volume=prefs.volume*.82;});
  if(v.elapsed<recordElapsed-.5){audioPlayed=new Set();voices.forEach(a=>a.pause());}
  if(v.elapsed!==recordElapsed){recordElapsed=v.elapsed;recordAt=performance.now();}
  const elapsed=v.elapsed+(replay?0:Math.min(.35,(performance.now()-recordAt)/1000)),conversation=v.stage==='conversation';
  score.update(v.stage,elapsed,{muted:isMuted()||(conversation&&elapsed>=TEASER_START&&elapsed<TEASER_END),volume:prefs.volume});
  stranger.visible=!q.seen&&(!conversation||elapsed<38.8);
  stranger.rotation.y=reducedMotion()?0:Math.sin(elapsed*.6)*.035;
  const gesture=conversation?Math.max(0,1-Math.abs(elapsed-8)/2):0;stranger.userData.leftArm.rotation.x=-.65-gesture*.55;stranger.userData.leftHand.position.z=.44+gesture*.15;
  returnButton.hidden=v.stage!=='archive';
  const own=players().find(p=>(p.id??'solo')===localId);
  const byExit=own&&Math.hypot(own.x,own.z-3.4)<2;
  returnButton.disabled=!byExit;
  hint.textContent=v.stage==='archive'?(byExit?'Press E to return the team to B1.':q.seen?'The stranger is gone. Return to the elevator.':'Approach the hooded stranger. Some things were never meant to be recovered.'):v.stage==='descent'?'SERVICE ELEVATOR · B1 → B2':v.stage==='return'?'RETURNING TO B1':'';
  if(v.stage==='archive'){
   input.updateView();camera.position.set(own?.x??0,1.65,own?.z??2.4);sub.textContent='';fade.style.opacity='0';
   if(byExit&&input.interact&&!interactHeld)onReturn();interactHeld=input.interact;
  }else if(conversation){
   const teaser=elapsed>=TEASER_START&&elapsed<TEASER_END;
   overlay.classList.toggle('watching-tape',teaser||replay);
   const monitorDistance=1.35/(2*Math.tan(camera.fov*Math.PI/360)*camera.aspect)*1.08;
   const positions=teaser?new THREE.Vector3(-.65,1.6,-1.94+monitorDistance):elapsed<3?new THREE.Vector3(-2.2,1.75,-.4):new THREE.Vector3(1.85,1.85,-1.4);
   camera.position.copy(positions);camera.lookAt(teaser?new THREE.Vector3(-.65,1.6,-2):new THREE.Vector3(.55,1.65,-3));
   sub.textContent=teaser?sampleTeaser(elapsed-TEASER_START).subtitle:elapsed<1?'':elapsed<3?'YOU: “Who are you?”':elapsed<6.2?'STRANGER: “Someone who knows what comes next.”':elapsed<TEASER_START?'STRANGER: “Watch carefully. Don’t look away.”':elapsed<38.4?'STRANGER: “That’s all I could recover. You should go.”':'';
   fade.style.opacity=elapsed>=38.4&&elapsed<39.6?'1':'0';
   for(const [index,at] of [[0,3],[1,6.2],[2,TEASER_END]])if(elapsed>=at&&!audioPlayed.has(index)){audioPlayed.add(index);if(elapsed-at<1&&!document.hidden)void voices[index].play().catch(()=>{});}
   if(teaser)teaserAudio.update(elapsed-TEASER_START,{muted:isMuted(),volume:prefs.volume});else teaserAudio.pause();
   monitor(elapsed-TEASER_START,teaser,elapsed>=TEASER_END&&elapsed<38.4,elapsed>=38.4);crt.intensity=elapsed>=38.4?0:teaser?4:1.3;

  }else{
   camera.position.set(0,1.65,2.3);camera.lookAt(0,1.5,4.3);fade.style.opacity=String(elapsed<.5?1-elapsed/.5:elapsed>(v.stage==='descent'?4.2:3.2)?Math.min(1,(elapsed-(v.stage==='descent'?4.2:3.2))/.65):0);sub.textContent='';
  }
  if(!conversation){monitor(0,false,false,q.seen);crt.intensity=q.seen?0:1.3;teaserAudio.pause();overlay.classList.remove('watching-tape');}
  const open=v.stage==='archive'?1:0;doorLeft.position.x=-.58-open;doorRight.position.x=.58+open;
  rim.intensity=conversation&&elapsed>38.4?0:3.5;
  lamp.intensity=conversation&&elapsed>38.4&&elapsed<39.6?0:10;
  for(const p of players())if((p.id??'solo')!==localId){if(asset&&!avatars.has(p.id)){const a=createPlayerAvatar(asset,p);avatars.set(p.id,a);scene.add(a.root);}avatars.get(p.id)?.update({...poseFor(p),interpolated:true},delta);}
  for(const [id,a] of avatars)if(!players().some(p=>p.id===id)){a.dispose();avatars.delete(id);}
  if(q.seen)rememberFootage();
  camera.updateWorldMatrix(true,false);renderer.toneMappingExposure=.95*prefs.brightness;renderer.render(scene,camera);return true;
 }
 function dispose(){disposed=true;finish();document.removeEventListener('visibilitychange',visibility);score.dispose();teaserAudio.dispose();teaserScene.dispose();renderer.domElement.removeEventListener('pointerdown',resumeScore);overlay.remove();voices.forEach(a=>{a.pause();a.removeAttribute('src');a.load();});avatars.forEach(a=>a.dispose());root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});resources.forEach(r=>r.dispose());}
 return {render,finish,dispose,scene,stranger,overlay,teaser:teaserScene};
}
export function createHalloweenQuestUI(root,run){
 const card=document.createElement('aside');card.className='halloween-quest';card.hidden=true;root.append(card);let previous='';
 return {update(){const q=run.halloween;card.hidden=!q||q.stage===0;if(!q)return;const text=`${q.stage}:${q.seen}`;if(text===previous)return;previous=text;card.replaceChildren();const title=document.createElement('strong');title.textContent=q.key?'✦ HALLOWEEN KEY':'THE PUMPKIN SEALS';const seals=document.createElement('span');seals.textContent=Array.from({length:3},(_,i)=>i<q.stage-1?'●':'○').join('  ');const clue=document.createElement('p');clue.textContent=halloweenClue(q);card.append(title,seals,clue);},dispose(){card.remove();}};
}
