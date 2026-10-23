import {createHoodedStranger} from './hooded-stranger.js';
import {loadKeeperAsset} from './imported-keeper.js';
import {b2Frame} from './b2-director.js';
import {createB2Voice} from './b2-voice.js';
import {createDeferredTeaser} from './deferred-teaser.js';
import {TEASER_START,TEASER_END} from './teaser-timeline.js';
import {createHalloweenAudio} from './halloween-audio.js';
import * as THREE from 'three';
import {gamePreferences,reducedMotion} from './preferences.js';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {halloweenClue} from './halloween-state.js';
export const FOOTAGE_KEY='monochrome.recovered-footage.2026';
export function hasRecoveredFootage(){try{return localStorage.getItem(FOOTAGE_KEY)==='1';}catch{return false;}}
export function rememberFootage(){try{localStorage.setItem(FOOTAGE_KEY,'1');}catch{}}

export function createHalloweenExperience({renderer,camera,run,input,ui,world=null,torch=null,players=()=>[],localId='solo',onReturn=()=>{},onMute=()=>{},isMuted=()=>false,poseFor=p=>p,replay=false,teaserPreview=false}){
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
 let keeper=createHoodedStranger(),stranger=keeper.root,keeperLoading=null;root.add(stranger);
 function prepareKeeper(){void prepareAvatars();keeperLoading??=loadKeeperAsset().then(asset=>{if(disposed)return;const replacement=createHoodedStranger({asset});keeper.dispose();keeper=replacement;stranger=keeper.root;root.add(stranger);}).catch(()=>{});return keeperLoading;}
 const switchBase=box(.19,.025,.16,.4,1.015,-2.13,metal),switchButton=box(.085,.065,.085,.4,1.065,-2.13,mat(0x66543b,{emissive:0x8b6431,emissiveIntensity:.3}));switchButton.name='archive-monitor-switch';
 box(.65,.025,.2,-.6,.99,-1.28,metal);for(let row=0;row<3;row++)for(let col=0;col<9;col++)box(.045,.012,.035,-.85+col*.061,1.01,-1.22-row*.05,paper);
 const rim=new THREE.PointLight(0x75938f,3.5,4);rim.position.set(1.3,2.7,-3.5);scene.add(rim);
 const ambient=new THREE.HemisphereLight(0x95a4ac,0x15100b,.65);scene.add(ambient);
 const keeperKey=new THREE.SpotLight(0xbac6c0,16,5,.68,1,2);keeperKey.position.set(1.8,2.5,-1.8);keeperKey.target.position.set(.55,1.5,-3);scene.add(keeperKey,keeperKey.target);
 const lamp=new THREE.PointLight(0xf2a55c,10,8,2);lamp.position.set(-2.7,2.7,-1);scene.add(lamp);box(.3,.06,.3,-2.7,2.9,-1,mat(0xffd6a1,{emissive:0xff8e39,emissiveIntensity:1}));
 const crt=new THREE.PointLight(0x8ebbb3,3.5,5);crt.position.set(0,1.6,-1.6);scene.add(crt);
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=448;const ctx=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;resources.add(texture);screenMaterial.map=texture;
 const doorLeft=box(1.15,2.8,.12,-.58,1.4,3.2),doorRight=box(1.15,2.8,.12,.58,1.4,3.2);
 const overlay=document.createElement('section');overlay.className='b2-overlay';overlay.hidden=true;overlay.innerHTML='<div class="b2-top"><div><small>RESTRICTED SERVICE ACCESS</small><strong>B2 / THE ARCHIVE</strong></div><button class="b2-mute">Sound on · M</button></div><div class="b2-letterbox"></div><p class="b2-subtitle" aria-live="polite"></p><div class="b2-fade"></div><div class="b2-bottom"><p class="b2-hint"></p><button class="b2-return" hidden>Return to B1</button></div>';
 document.body.append(overlay);const el=s=>overlay.querySelector(s),sub=el('.b2-subtitle'),fade=el('.b2-fade'),hint=el('.b2-hint'),returnButton=el('.b2-return');returnButton.onclick=()=>{renderer.domElement.focus();onReturn();};el('.b2-mute').onclick=()=>{onMute();resumeScore();renderer.domElement.focus();};
 const score=createHalloweenAudio(),{scene:teaserScene,audio:teaserAudio,sample:sampleFilm}=createDeferredTeaser();
 const voice=createB2Voice();const resumeScore=()=>{score.resume();teaserAudio.resume();voice.resume();};renderer.domElement.addEventListener('pointerdown',resumeScore);overlay.addEventListener('pointerdown',resumeScore);const unlockKey=()=>{if(active)resumeScore();};document.addEventListener('keydown',unlockKey);
 const visibility=()=>{if(document.hidden){voice.pause();score.pause();teaserAudio.pause();}};document.addEventListener('visibilitychange',visibility);
 const avatars=new Map();let asset,disposed=false,avatarLoading=null;function prepareAvatars(){avatarLoading??=loadPlayerAvatarAsset().then(a=>{if(!disposed)asset=a;}).catch(()=>{});return avatarLoading;}
 let active=false,stageKey='',recordElapsed=-1,recordAt=0,interactHeld=false,entryPose=null,unlockEntry=null,reveal=null;
 let lastMonitorFrame=null;
 function monitor(t,playing,hold=false,dead=false){
  screenMaterial.color.setHex(dead?0x000000:0xffffff);
  if((playing||hold)&&teaserScene.target&&!teaserScene.error){screenMaterial.map=teaserScene.target.texture;teaserScene.render(renderer,hold?(TEASER_END-TEASER_START-.05):t,{reducedMotion:reducedMotion(),quality:gamePreferences().quality});return;}
  screenMaterial.map=texture;
  const frame=dead?'dead':teaserScene.error?'error':playing||hold?'loading':'idle';if(frame===lastMonitorFrame)return;lastMonitorFrame=frame;
  if(dead){ctx.fillStyle='#000';ctx.fillRect(0,0,768,448);texture.needsUpdate=true;return;}
  ctx.fillStyle='#06100f';ctx.fillRect(0,0,768,448);ctx.fillStyle='#5b7770';ctx.font='22px monospace';ctx.fillText('B2 / RECOVERED SIGNAL',55,80);ctx.font='16px monospace';ctx.fillText(teaserScene.error?'SIGNAL LOST / TRY REPLAY':playing||hold?'RECOVERING SIGNAL…':'NO LIVE SIGNAL',55,119);
  ctx.fillStyle='rgba(0,0,0,.22)';for(let y=0;y<448;y+=4)ctx.fillRect(0,y,768,1);texture.needsUpdate=true;
 }
 function viewPose(){camera.updateMatrixWorld();const d=camera.getWorldDirection(new THREE.Vector3());return {position:camera.position.toArray(),look:camera.position.clone().add(d).toArray()};}
 function finish(showReveal=true){if(!active)return;active=false;overlay.hidden=true;ui.root.hidden=false;ui.overlay=null;input.clear();const own=players().find(p=>(p.id??'solo')===localId);if(own)input.setView(own.yaw??Math.PI,own.pitch??0);document.body.classList.remove('b2-active');voice.pause();score.pause();teaserAudio.pause();
  if(showReveal&&!disposed){reveal?.remove();reveal=document.createElement('div');reveal.className='b2-return-reveal';document.body.append(reveal);const veil=reveal;setTimeout(()=>{veil.remove();if(reveal===veil)reveal=null;},750);}
 }
 function render(delta){
  const q=run.halloween,v=q?.visit;if(!v){finish();return false;}
  if(!active){void prepareKeeper();active=true;overlay.hidden=false;input.clear();resumeScore();document.body.classList.add('b2-active');}
  const cinematic=v.stage!=='archive',key=`${v.id}:${v.stage}:${v.startedAt}`;
  if(key!==stageKey){stageKey=key;recordElapsed=-1;voice.pause();teaserAudio.pause();input.clear();
   if(v.stage==='unlock')unlockEntry=viewPose();if(v.stage==='conversation')entryPose=viewPose();
   if(v.stage==='archive'){const own=players().find(p=>(p.id??'solo')===localId);input.setView(own?.yaw??0,own?.pitch??0);}if(cinematic)document.exitPointerLock?.();
  }
  ui.overlay=cinematic?'halloween':null;ui.root.hidden=cinematic;overlay.classList.toggle('cinematic',cinematic);
  el('.b2-mute').textContent=isMuted()?'Sound off · M':'Sound on · M';el('.b2-top strong').textContent=v.stage==='unlock'?'B1 / SERVICE ACCESS':'B2 / THE ARCHIVE';
  const prefs=gamePreferences();if(v.elapsed!==recordElapsed){recordElapsed=v.elapsed;recordAt=performance.now();}
  const elapsed=v.elapsed+(replay?0:Math.min(.35,(performance.now()-recordAt)/1000)),conversation=v.stage==='conversation',own=players().find(p=>(p.id??'solo')===localId),frame=conversation?b2Frame(elapsed,{entry:entryPose??undefined,aspect:camera.aspect,fov:camera.fov}):null;
  score.update(v.stage,elapsed,{muted:isMuted()||(conversation&&frame.watching),volume:prefs.volume});
  const towardPlayer=entryPose?Math.atan2(entryPose.position[0]-.55,entryPose.position[2]+3):0;
  stranger.visible=!q.seen&&(!conversation||frame.strangerVisible);keeper.sample(elapsed,{reach:frame?.reach??0,press:frame?.press??0,headYaw:towardPlayer*(1-(frame?.monitorTurn??0))-.8*(frame?.monitorTurn??0),reducedMotion:reducedMotion(),switchAt:[.4,1.11,-2.13]});
  switchButton.position.y=1.065-(frame?.press??0)*.012;switchButton.material.emissiveIntensity=conversation&&elapsed>10.4?.8:.2;
  returnButton.hidden=v.stage!=='archive';const byExit=own&&Math.hypot(own.x,own.z-3.4)<2;returnButton.disabled=!byExit;
  hint.textContent=v.stage==='archive'?(byExit?'Press E to return the team to B1.':q.seen?'The stranger is gone. Follow the service lift back.':'Approach the hooded stranger. Some things were never meant to be recovered.'):v.stage==='unlock'?'HALLOWEEN KEY · B2 SERVICE ACCESS':v.stage==='descent'?'SERVICE LIFT · B1 → B2':v.stage==='return'?'RETURNING TO B1':'';
  if(v.stage==='unlock'&&world){
   const panel=world.halloween.keyPanel.root.position,blend=THREE.MathUtils.smoothstep(elapsed,0,.65),start=unlockEntry??viewPose();camera.position.fromArray(start.position).lerp(new THREE.Vector3(panel.x+.18,panel.y+.4,panel.z+1.1),blend);camera.lookAt(new THREE.Vector3().fromArray(start.look).lerp(new THREE.Vector3(panel.x,panel.y+.15,panel.z+.06),blend));
   world.halloween.update(performance.now()/1000,{player:own,visibility:world.lighting.visibility,reducedMotion:reducedMotion()});torch?.update({surfaceDistance:1,ceilingPower:world.lighting.visibility,time:elapsed,delta});sub.textContent='';fade.style.opacity=String(THREE.MathUtils.smoothstep(elapsed,2.1,2.8));voice.pause();teaserAudio.pause();renderer.toneMappingExposure=.95*prefs.brightness;renderer.render(world.scene,camera);return true;
  }
  if(v.stage==='archive'){
   input.updateView();camera.position.set(own?.x??0,1.65,own?.z??2.4);sub.textContent='';fade.style.opacity='0';voice.pause();if(byExit&&input.interact&&!interactHeld)onReturn();interactHeld=input.interact;
  }else if(conversation){
   overlay.classList.toggle('watching-tape',frame.watching||replay);camera.position.fromArray(frame.camera);camera.lookAt(new THREE.Vector3(...frame.look));
   sub.textContent=frame.watching?sampleFilm(elapsed-TEASER_START).subtitle:frame.subtitle;fade.style.opacity=String(frame.fade);voice.update(elapsed,{muted:isMuted(),volume:prefs.volume});
   if(frame.watching)teaserAudio.update(elapsed-TEASER_START,{muted:isMuted(),volume:prefs.volume});else teaserAudio.pause();
   monitor(elapsed-TEASER_START,frame.watching,elapsed>=TEASER_END&&elapsed<TEASER_END+7.2,elapsed>=TEASER_END+7.2);crt.intensity=elapsed>=TEASER_END+7.2?0:frame.watching?4:1.3;
  }else{
   const slot=own?.slot??0,x=(slot%2-.5)*1.1,row=Math.floor(slot/2),walking=THREE.MathUtils.smoothstep(elapsed,3.8,5);camera.position.set(x,1.65,v.stage==='descent'?THREE.MathUtils.lerp(3.75+row*.2,2.4+row*.55,walking):3.75+row*.2);camera.lookAt(x,1.6,0);
   fade.style.opacity=String(elapsed<.5?1-elapsed/.5:v.stage==='return'&&elapsed>3.2?Math.min(1,(elapsed-3.2)/.8):0);sub.textContent='';voice.pause();
  }
  if(!conversation){monitor(0,false,false,q.seen);crt.intensity=q.seen?0:1.3;teaserAudio.pause();overlay.classList.remove('watching-tape');}
  const open=v.stage==='descent'?THREE.MathUtils.smoothstep(elapsed,3.5,4.7):v.stage==='return'?1-THREE.MathUtils.smoothstep(elapsed,.3,1.2):1;doorLeft.position.x=-.58-open;doorRight.position.x=.58+open;
  const blackout=conversation&&elapsed>TEASER_END+7.2&&elapsed<TEASER_END+9.1;rim.intensity=blackout?0:3.5;lamp.intensity=blackout?0:10;keeperKey.intensity=blackout?0:16;
  for(const p of players())if((p.id??'solo')!==localId){
   if(asset&&!avatars.has(p.id)){const a=createPlayerAvatar(asset,p);avatars.set(p.id,a);scene.add(a.root);}const a=avatars.get(p.id);if(!a)continue;
   if(v.stage==='descent'||v.stage==='return'){const slot=p.slot??0,row=Math.floor(slot/2),walk=THREE.MathUtils.smoothstep(elapsed,3.8,5);a.update({...p,x:(slot%2-.5)*1.1,z:v.stage==='descent'?THREE.MathUtils.lerp(3.75+row*.2,2.4+row*.55,walk):3.75+row*.2,height:0,yaw:0,torch:false,moving:v.stage==='descent'&&walk>0&&walk<1},delta);}else a.update({...poseFor(p),interpolated:true},delta);
  }
  for(const [id,a]of avatars)if(!players().some(p=>p.id===id)){a.dispose();avatars.delete(id);}if(q.seen)rememberFootage();
  camera.updateWorldMatrix(true,false);renderer.toneMappingExposure=.95*prefs.brightness;renderer.render(scene,camera);return true;
 }
 function dispose(){if(disposed)return;disposed=true;finish(false);reveal?.remove();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',unlockKey);score.dispose();voice.dispose();teaserAudio.dispose();teaserScene.dispose();renderer.domElement.removeEventListener('pointerdown',resumeScore);overlay.remove();avatars.forEach(a=>a.dispose());keeper.dispose();root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});resources.forEach(r=>r.dispose());}

 return {render,finish,dispose,scene,get stranger(){return stranger;},get keeper(){return keeper;},get keeperReady(){return prepareKeeper();},voice,switchButton,overlay,teaser:teaserScene};
}
export function createHalloweenQuestUI(root,run){
 const card=document.createElement('aside');card.className='halloween-quest';card.hidden=true;root.append(card);let previous='';
 return {update(){const q=run.halloween;card.hidden=!q||q.stage===0;if(!q)return;const text=`${q.stage}:${q.seen}`;if(text===previous)return;previous=text;card.replaceChildren();const title=document.createElement('strong');title.textContent=q.key?'✦ HALLOWEEN KEY':'THE PUMPKIN SEALS';const seals=document.createElement('span');seals.textContent=Array.from({length:3},(_,i)=>i<q.stage-1?'●':'○').join('  ');const clue=document.createElement('p');clue.textContent=halloweenClue(q);card.append(title,seals,clue);},dispose(){card.remove();}};
}
