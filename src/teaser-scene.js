import * as THREE from 'three';
import {createCreature,applyIdle} from './creature.js';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {loadTeaserMonsters,createTeaserMonster} from './teaser-monsters.js';
import {sampleTeaser} from './teaser-timeline.js';
import {NEEDLELIMBS_READY} from './teaser-edition.js';
import {createNeedlelimbsTeaserScene} from './needlelimbs-scene.js';

/** A restrained in-engine teaser: the geometry hides most of every new creature. */
export function createTeaserScene(){
 if(NEEDLELIMBS_READY)return createNeedlelimbsTeaserScene();
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x030708);scene.fog=new THREE.Fog(0x060c0d,8,25);
 const camera=new THREE.PerspectiveCamera(54,16/9,.05,45);scene.add(camera);
 const target=new THREE.WebGLRenderTarget(960,540,{depthBuffer:true});target.texture.colorSpace=THREE.SRGBColorSpace;
 const geometries=new Set(),materials=new Set(),textures=new Set(),monsters=new Map();let survivor,loadError=null,disposed=false,lastSample=sampleTeaser(0);
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.91,...extra});materials.add(m);return m;};
 const wall=material(0x3d4946),floor=material(0x222c29),steel=material(0x1b2425,{metalness:.4,roughness:.6}),trim=material(0x0c1616),lampMat=material(0xaed3c6,{emissive:0x7eaa9a,emissiveIntensity:1.2});
 const c=document.createElement('canvas');c.width=c.height=256;const grain=c.getContext('2d');grain.fillStyle='#92998f';grain.fillRect(0,0,256,256);let seed=704;
 for(let i=0;i<9000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%256;seed=(Math.imul(seed,1664525)+1013904223)>>>0;grain.fillStyle=i%2?'#111e1910':'#e0e6d510';grain.fillRect(x,seed%256,1+i%2,1);}
 const concreteMap=new THREE.CanvasTexture(c);concreteMap.colorSpace=THREE.SRGBColorSpace;concreteMap.wrapS=concreteMap.wrapT=THREE.RepeatWrapping;textures.add(concreteMap);wall.map=concreteMap;floor.map=concreteMap;
 function box(w,h,d,x,y,z,m=wall){const g=new THREE.BoxGeometry(w,h,d);geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);scene.add(o);return o;}
 function sideWall(side,start,end){box(.2,4.4,end-start,side*2.35,2.1,(start+end)/2);box(.045,.7,end-start,side*2.22,.4,(start+end)/2,steel);box(.05,.055,end-start,side*2.19,1.05,(start+end)/2,trim);}
 box(4.6,.2,23,0,-.12,-5,floor);box(4.6,.15,23,0,4.3,-5,trim);
 // Three real recesses give the reveals physical occlusion rather than pop-in.
 for(const [a,b] of [[-16.5,-10.8],[-8.7,-6.1],[-3.8,6.5]])sideWall(-1,a,b);
 for(const [a,b] of [[-16.5,-10.8],[-8.7,-8.2],[-5.8,6.5]])sideWall(1,a,b);
 box(12,.15,2.1,0,-.1,-9.75,floor);for(const x of [-6,6])box(.2,4.3,2.1,x,2.1,-9.75,trim);
 for(const side of [-1,1]){box(3.6,4.3,.15,side*4.15,2.1,-10.8);box(3.6,4.3,.15,side*4.15,2.1,-8.7);}
 box(4,.15,2.4,4.3,-.1,-7,floor);box(4,4.3,.15,4.3,2.1,-8.2);box(4,4.3,.15,4.3,2.1,-5.8);box(.2,4.3,2.4,6.3,2.1,-7,trim);
 box(4,.15,2.3,-4.3,-.1,-4.95,floor);box(4,4.3,.15,-4.3,2.1,-6.1);box(4,4.3,.15,-4.3,2.1,-3.8);box(.2,4.3,2.3,-6.3,2.1,-4.95,trim);
 for(const z of [-10.8,-8.7,-6.1,-3.8])box(.28,4.3,.22,-2.25,2.1,z,steel);
 for(const z of [-10.8,-8.7,-8.2,-5.8])box(.28,4.3,.22,2.25,2.1,z,steel);
 box(1.85,2.3,1.35,2.25,1.15,-6.55,steel);
 // A narrow opening and return wall conceal the maw's torso and limbs.
 box(.18,2,.65,-2.32,1,-4.1,steel);box(.3,4.3,.2,-2.25,2.1,-5.7,steel);
 for(let z=-15;z<6;z+=1.5)box(4.5,.008,.018,0,.004,z,trim);
 for(const side of [-1,1])for(let z=-13;z<5;z+=4){if(z===-5&&side===-1)continue;box(.08,2.65,1.2,side*2.19,1.325,z,steel);box(.09,.1,.24,side*2.12,1.15,z+.35,lampMat);}
 for(const x of [-1.75,1.75])box(.09,.09,21,x,3.95,-5,steel);
 // The familiar observation door keeps Monochrome distant until the final beat.
 box(4.5,2.65,.2,0,1.325,-14,steel);box(4.5,.4,.2,0,4.1,-14,steel);for(const x of [-1.85,1.85])box(.75,1.25,.2,x,3.27,-14,steel);
 box(4.6,4.3,.2,0,2.1,-16.3,trim);
 box(4.5,4.3,.2,0,2.1,5,trim);const doors=[box(1.03,3.2,.12,-.52,1.6,4.7,steel),box(1.03,3.2,.12,.52,1.6,4.7,steel)];
 box(.12,3.3,.28,-1.13,1.65,4.65);box(.12,3.3,.28,1.13,1.65,4.65);box(2.4,.15,.28,0,3.3,4.65,lampMat);
 function label(text,width,height){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const g=canvas.getContext('2d');g.fillStyle='#122020';g.fillRect(0,0,512,128);g.strokeStyle='#647f70';g.strokeRect(5,5,502,118);g.fillStyle='#c5ceba';g.textAlign='center';g.font='bold 32px monospace';g.fillText(text,256,76);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);const m=new THREE.MeshBasicMaterial({map:t});materials.add(m);const geo=new THREE.PlaneGeometry(width,height);geometries.add(geo);const o=new THREE.Mesh(geo,m);scene.add(o);return o;}
 label('02 / RESTRICTED',1.7,.425).position.set(0,2.18,-13.88);const exit=label('SERVICE / EXIT',1.7,.425);exit.position.set(0,3.65,4.57);exit.rotation.y=Math.PI;
 scene.add(new THREE.HemisphereLight(0x93b5ad,0x18211c,.9));
 const lamps=[];for(const z of [2,-3,-9.7,-15]){box(1.25,.035,.24,0,4.15,z,lampMat);const l=new THREE.PointLight(0xa0c8b9,14,7.5,2);l.position.set(0,3.85,z);scene.add(l);lamps.push(l);}
 const revealLight=new THREE.PointLight(0xa9bab0,9,5,2);scene.add(revealLight);
 const backLight=new THREE.PointLight(0x668c82,13,5,2);backLight.position.set(0,3.7,-15.6);scene.add(backLight);
 const creature=createCreature();scene.add(creature.root);creature.root.position.z=-15.3;
 const bodyMat=material(0x030606),old=new Set();creature.root.traverse(o=>{if(o.isMesh&&o.material.userData.creatureBody){old.add(o.material);o.material=bodyMat;}});old.forEach(m=>m.dispose());
 const torch=new THREE.Group();scene.add(torch);const barrel=box(.07,.07,.3,0,0,0,steel);torch.add(barrel);barrel.position.set(0,0,0);const beam=new THREE.SpotLight(0xcfdcc0,22,13,.38,.75,1.5);torch.add(beam,beam.target);beam.target.position.set(.1,-.12,-9);
 const titleCanvas=document.createElement('canvas');titleCanvas.width=1280;titleCanvas.height=720;const ctx=titleCanvas.getContext('2d');ctx.fillStyle='#020504';ctx.fillRect(0,0,1280,720);ctx.textAlign='center';ctx.fillStyle='#829486';ctx.font='18px monospace';ctx.fillText('RECOVERED FOOTAGE / END OF TRANSMISSION',640,244);ctx.fillStyle='#e4e7db';ctx.font='bold 82px sans-serif';ctx.fillText('MONOCHROME',590,380);ctx.fillStyle='#c29d68';ctx.fillText('II',985,380);ctx.fillRect(457,434,366,1);
 const titleTexture=new THREE.CanvasTexture(titleCanvas);titleTexture.colorSpace=THREE.SRGBColorSpace;textures.add(titleTexture);const titleMaterial=new THREE.MeshBasicMaterial({map:titleTexture,depthTest:false,depthWrite:false,toneMapped:false});materials.add(titleMaterial);const titleGeometry=new THREE.PlaneGeometry(2*Math.tan(54*Math.PI/360)*16/9,2*Math.tan(54*Math.PI/360));geometries.add(titleGeometry);const title=new THREE.Mesh(titleGeometry,titleMaterial);title.position.z=-1;title.renderOrder=100;camera.add(title);
 const blackMaterial=new THREE.MeshBasicMaterial({color:0,depthTest:false,depthWrite:false});materials.add(blackMaterial);const blackout=new THREE.Mesh(titleGeometry,blackMaterial);blackout.position.z=-1;blackout.renderOrder=99;camera.add(blackout);
 const ready=Promise.all([loadPlayerAvatarAsset(),loadTeaserMonsters()]).then(([asset,assets])=>{if(disposed)return;survivor=createPlayerAvatar(asset,{id:'tape-survivor',slot:0,name:''});scene.add(survivor.root);for(const [id,model] of Object.entries(assets)){const actor=createTeaserMonster(model,id);monsters.set(id,actor);scene.add(actor.root);}}).catch(error=>{loadError=error;});
 const look=new THREE.Vector3();
 function sample(t,{reducedMotion=false}={}){
  const s=sampleTeaser(t),u=s.time;lastSample=s;title.visible=s.shot==='title';blackout.visible=s.blackout;
  const z=u<5?4-u*1.1:u<10?-1.5-(u-5)*.34:-3.2;
  survivor?.sampleCinematic({clip:u<10?'Walk':'Idle',time:u,position:[-.5,0,z],yaw:0});if(survivor)survivor.root.visible=u<5;
  for(const actor of monsters.values())actor.root.visible=false;
  if(s.glimpse){const {id,amount,progress}=s.glimpse,actor=monsters.get(id);if(actor){actor.root.visible=true;
   if(id==='sonask')actor.sample(u,{position:[2.68-amount*.28,0,-7.4],yaw:-.55,lean:amount*.18,progress});
   if(id==='crawler')actor.sample(u,{position:[-3.5+progress*7,0,-9.7],yaw:Math.PI/2,pitch:.65,progress});
   if(id==='maw')actor.sample(u,{position:[-3.35+amount*.32,-.12,-5.15],yaw:.65,lean:-amount*.08,progress});
  }}
  applyIdle(creature,{sway:0,pitch:0,yaw:0,arm:0});creature.root.position.set(0,0,-15.3);creature.root.visible=u>=20&&u<20.65;
  doors[0].position.x=-.52-Math.min(1,u/1.2);doors[1].position.x=.52+Math.min(1,u/1.2);
  for(let i=0;i<lamps.length;i++)lamps[i].intensity=u>=20.2?0:14;
  if(u<10)revealLight.position.set(1.1,3.1,-6.5);else if(u<15)revealLight.position.set(0,2.5,-9.1);else revealLight.position.set(-1.5,2.2,-4.5);
  revealLight.intensity=u<20?7:0;backLight.intensity=u>=20?10:5;
  torch.visible=u<20;const held=survivor?.root.getObjectByName('player-torch');if(u<5&&held){held.getWorldPosition(torch.position);held.getWorldQuaternion(torch.quaternion);torch.rotateY(Math.PI);}else{torch.position.set(.35,1.2,-3.1);torch.rotation.set(-.08,0,0);}beam.intensity=u<15?18:0;
  if(u<2.5){camera.position.set(-1.8,1.5,-.5);look.set(0,1.45,3);}
  else if(u<5){camera.position.set(-1.75,1.6,1-u*.18);look.set(-.15,1.45,3-u*1.1);}
  else if(u<10){camera.position.set(-.55,1.7,-2.2);look.set(1.6,2.15,-7.6);}
  else if(u<15){camera.position.set(.2,1.65,-4.2);look.set(0,1.25,-9.7);}
  else if(u<20){camera.position.set(.65,1.65,-2.75);look.set(-2.5,1.65,-5.1);}
  else {camera.position.set(.15,2.8,-9.9);look.set(0,3.2,-15.3);}
  if(!reducedMotion&&u>=5&&u<20)camera.position.z-=(u%5)*.018;
  camera.lookAt(look);scene.updateMatrixWorld(true);return s;
 }
 function render(renderer,t,options){const width=options?.quality==='low'?640:960;if(target.width!==width)target.setSize(width,width*9/16);sample(t,options);
  const previous=renderer.getRenderTarget(),exposure=renderer.toneMappingExposure,auto=renderer.autoClear,viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
  try{renderer.setRenderTarget(target);renderer.setViewport(0,0,target.width,target.height);renderer.setScissorTest(false);renderer.autoClear=true;renderer.toneMappingExposure=1.05;renderer.render(scene,camera);}finally{renderer.setRenderTarget(previous);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.toneMappingExposure=exposure;renderer.autoClear=auto;}
 }
 function dispose(){if(disposed)return;disposed=true;survivor?.dispose();monsters.forEach(a=>a.dispose());const gs=new Set(geometries),ms=new Set(materials);scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());target.dispose();}
 return {scene,camera,target,creature,monsters,ready,sample,render,dispose,get survivor(){return survivor;},get error(){return loadError;},get state(){return lastSample;}};
}
