import * as T from 'three';
import {createBriefingProps} from './launch-briefing-props.js';
import {createCreature,applyIdle,applyRunning} from './creature.js';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {createBriefingNarrator} from './briefing-narrator.js';
import {loadBriefingNarratorAsset} from './briefing-narrator-model.js';
import {sampleBriefingDirection} from './briefing-director.js';

const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;


/** Pure absolute-time scene, also used by browser fixtures without a playback loop. */
export function createLaunchBriefingStage({asset=null,narratorAsset=null,reducedMotion=false}={}){
 const scene=new T.Scene();scene.name='halloween-launch-briefing';scene.background=new T.Color(0x050908);scene.fog=new T.FogExp2(0x0c1511,.036);
 const camera=new T.PerspectiveCamera(54,1,.05,70),props=createBriefingProps();scene.add(props.root);
 const fill=new T.HemisphereLight(0xb6c4ba,0x262017,.47);scene.add(fill);
 const key=new T.SpotLight(0xe9d1a0,24,20,.85,.85,1.7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0006;key.shadow.normalBias=.025;scene.add(key,key.target);
 const rim=new T.PointLight(0x7ea9a0,10,12,2);scene.add(rim);
 const creature=createCreature();creature.root.name='original-monochrome';creature.root.scale.setScalar(.67);scene.add(creature.root);
 let narrator=createBriefingNarrator({asset:narratorAsset});scene.add(narrator.root);
 const actors=[],focalPoint=new T.Vector3(),look=new T.Vector3();let disposed=false,aspect=1,lastTime=0;
 const lights=[...props.lights,fill,key,rim];
 function attachAsset(next){
  if(disposed||actors.length)return;
  for(let i=0;i<2;i++){const actor=createPlayerAvatar(next,{id:`briefing-friend-${i}`,name:'',slot:i});actors.push(actor);scene.add(actor.root);}
 }
 if(asset)attachAsset(asset);
 function attachNarrator(next){if(disposed)return;const replacement=createBriefingNarrator({asset:next});narrator.dispose();narrator=replacement;scene.add(narrator.root);sample(lastTime);}
 function resize(next){aspect=clamp(Number.isFinite(next)?next:1,.2,5);camera.aspect=aspect;
  // Expand vertical field on narrow screens. The canvas is never cropped into a monitor.
  camera.fov=aspect<.75?82:aspect<1?68:54;camera.updateProjectionMatrix();
 }
 function sample(seconds){
  if(disposed)return null;
  const direction=sampleBriefingDirection(seconds,{reducedMotion}),{elapsed,shot,poseTime:t}=direction;lastTime=elapsed;
  const welcome=['welcome','aside','cutaway','management'].includes(shot),hall=['corridor','friends','presence'].includes(shot),clues=shot==='clues'||shot==='notes',door=shot==='sealed-door';
  props.basement.visible=welcome;props.corridor.visible=hall;props.clues.visible=clues;props.sealed.visible=door;
  camera.fov=aspect<.75?82:aspect<1?68:54;camera.updateProjectionMatrix();fill.intensity=.47;key.intensity=24;rim.intensity=10;rim.color.setHex(0x7ea9a0);
  for(const light of props.lights){light.intensity=light.userData.baseIntensity;if(light.userData.fixtureMaterial)light.userData.fixtureMaterial.emissiveIntensity=1.1;}
  for(let i=0;i<props.flames.length;i++){const flame=props.flames[i];flame.scale.y=.065*(reducedMotion?1:1+Math.sin(t*7.3+i*2.8)*.11);}
  creature.root.visible=shot==='presence'&&elapsed>=85.5;
  narrator.root.visible=direction.hostVisible;
  narrator.root.position.set(shot==='presence'?30.95:-.5,0,shot==='presence'?3.2:-3.22);narrator.root.rotation.y=shot==='presence'?-.12:0;
  narrator.sample(t,{...direction,reducedMotion});
  applyIdle(creature,{sway:reducedMotion?0:Math.sin(t*.9)*.009,pitch:-.035,yaw:0,arm:0});
  if(!reducedMotion&&shot==='presence')applyRunning(creature,Math.max(0,t-85.5)*.45,.85);
  creature.root.position.set(32,creature.root.position.y,reducedMotion?-7.7:lerp(-13,-4.2,clamp((t-85.5)/8.5,0,1)));creature.root.rotation.y=0;
  for(let i=0;i<actors.length;i++){
   const progress=clamp((t-34)/16,0,1),distance=progress*7.1;
   const position=[32+(i? .62:-.62),0,-4+(i?1:-1)*distance];
   if(shot==='friends')actors[i].sampleCinematic({clip:reducedMotion?'Idle':'Walk',time:reducedMotion?0:(t-34)*.42+i*.31,position,yaw:i?Math.PI:0});else{actors[i].root.position.set(...position);actors[i].root.rotation.y=i?Math.PI:0;}
   actors[i].root.visible=shot==='friends';
  }
  if(welcome){
   const tight=['aside','cutaway','management'].includes(shot),push=reducedMotion?0:Math.min(1,t/16);
   camera.position.set(tight?.25:lerp(.85,.45,push),1.68,tight?1.0:lerp(2.8,2.1,push));focalPoint.set(-.5,tight?1.47:1.34,-3.15);
   key.position.set(-2.2,2.8,.1);key.target.position.set(-.5,1.4,-3.1);rim.position.set(.4,2.1,-4.35);rim.color.setHex(0x8db5bb);rim.intensity=15;
   camera.fov=aspect<.75?(tight?60:66):(tight?49:54);camera.updateProjectionMatrix();if(tight)key.intensity=19;
  }else if(shot==='corridor'){
   camera.position.set(32.25,1.65,6-(t-16)*.15);focalPoint.set(32,1.5,-5.7);key.position.set(30.5,2.65,3);key.target.position.set(32,1,-5);rim.position.set(32,2,-7);
  }else if(shot==='friends'){
   camera.position.set(32.1,1.8,8);focalPoint.set(32,1.15,-3);key.position.set(33.5,2.9,5);key.target.position.set(32,1,-3);rim.position.set(30,2,-9);
   // A grounded near/far arrangement keeps both full-body silhouettes legible on phones.
   if(aspect<.75){camera.position.z=9;camera.position.y=1.85;}
  }else if(shot==='clues'){
   camera.position.set(65.1-(t-50)*.025,1.94,1.1-(t-50)*.025);focalPoint.set(64.1,1.04,-1.65);key.position.set(64.5,3,.3);key.target.position.set(64,.9,-1.6);rim.position.set(65,2,-3);
  }else if(shot==='notes'){
   camera.position.set(64.4,2.03,-.55-(t-60)*.025);focalPoint.set(63.6,2.0,-4.26);key.position.set(64.8,2.8,-1);key.target.position.set(63.6,2,-4);rim.position.set(62,2.6,-3);
  }else if(door){
   camera.position.set(96.12,1.7,1.2-(t-70)*.55);focalPoint.set(96,1.68,-4.12);key.position.set(95,2.8,-1.5);key.target.position.copy(focalPoint);rim.position.set(98,2,-3);
  }else{
   camera.position.set(32.08,1.65,7.8);focalPoint.set(31.8,1.6,-2.5);key.position.set(29.8,2.6,5.6);key.target.position.set(31.1,1.3,3.2);key.intensity=10;
   rim.position.set(32,2.5,-16);rim.intensity=16;fill.intensity=.2;
   for(const light of props.lights){
    if(light.parent!==props.corridor)continue;
    const index=light.userData.corridorIndex;
    if(index!==undefined){const outAt=82+(5-index)*1.35,fade=1-T.MathUtils.smoothstep(t,outAt,outAt+.22);light.intensity=light.userData.baseIntensity*fade;if(light.userData.fixtureMaterial)light.userData.fixtureMaterial.emissiveIntensity=1.1*fade;}
    else light.intensity*=1-clamp((t-84)/7,0,1);
   }
   // The original silhouette advances quietly; no lunge or additional creature.
   if(!reducedMotion){camera.position.z+=clamp((t-90)/4,0,1)*.3;key.intensity*=1-clamp((t-90)/4,0,1);}
  }
  // Put the subject in the central safe area; the bottom fifth belongs to captions.
  look.copy(focalPoint);look.y-=shot==='friends'?.3:.16;camera.lookAt(look);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  return {...direction,hostImported:!!narrator.imported,complete:elapsed>=94};
 }
 function dispose(){
  if(disposed)return;disposed=true;
  narrator.dispose();for(const actor of actors)actor.dispose();actors.length=0;
  const creatureGeometry=new Set(),creatureMaterial=new Set();creature.root.traverse(o=>{if(o.geometry)creatureGeometry.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])creatureMaterial.add(m);});
  for(const g of creatureGeometry)g.dispose();for(const m of creatureMaterial)m.dispose();props.dispose();key.dispose();rim.dispose();scene.clear();
 }
 return {scene,camera,actors,creature,lights,focalPoint,resize,sample,dispose,attachAsset,attachNarrator,get narrator(){return narrator;},get elapsed(){return lastTime;}};
}

export function preloadLaunchBriefingSceneAssets(){return Promise.allSettled([loadPlayerAvatarAsset(),loadBriefingNarratorAsset()]);}

/** Owns its canvas/resources, while the parent owns the only playback clock and RAF. */
export function createLaunchBriefingScene(container,{reducedMotion=false}={}){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.25));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const canvas=renderer.domElement;canvas.className='launch-briefing-canvas';canvas.setAttribute('aria-hidden','true');Object.assign(canvas.style,{display:'block',width:'100%',height:'100%',position:'absolute',inset:'0'});container.append(canvas);
 const stage=createLaunchBriefingStage({reducedMotion});let disposed=false,elapsed=0,lastRendered=null;
 function render(force=false){const key=stage.sample(elapsed)?.poseTime;if(!disposed&&(force||key!==lastRendered)){renderer.render(stage.scene,stage.camera);lastRendered=key;}}
 function resize(){if(disposed)return;const bounds=container.getBoundingClientRect(),width=Math.max(1,bounds.width),height=Math.max(1,bounds.height);renderer.setSize(width,height,false);stage.resize(width/height);stage.sample(elapsed);render(true);}
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(container);if(!observer)globalThis.addEventListener?.('resize',resize);
 resize();
 const ready=Promise.allSettled([loadPlayerAvatarAsset().then(asset=>{if(!disposed)stage.attachAsset(asset);}),loadBriefingNarratorAsset().then(asset=>{if(!disposed)stage.attachNarrator(asset);})]).then(()=>{if(!disposed){stage.sample(elapsed);render(true);}});
 function sample(seconds){if(disposed)return null;elapsed=Number.isFinite(seconds)?seconds:0;const frame=stage.sample(elapsed);if(frame.poseTime!==lastRendered){renderer.render(stage.scene,stage.camera);lastRendered=frame.poseTime;}return frame;}
 function dispose(){if(disposed)return;disposed=true;observer?.disconnect();if(!observer)globalThis.removeEventListener?.('resize',resize);stage.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 return {ready,sample,dispose};
}
