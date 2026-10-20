import * as THREE from 'three';
import {createCreature,applyIdle,applyRunning} from './creature.js';
import {loadPlayerAvatarAsset,createPlayerAvatar} from './player-avatar.js';
import {createJumpscareMouth,JUMPSCARE_MOUTH_URL} from './jumpscare.js';
import {sampleTeaser} from './teaser-timeline.js';

/** Real game actors, rendered into the archive monitor. No external video. */
export function createTeaserScene(){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x060b0c);scene.fog=new THREE.Fog(0x0a1011,10,30);
 const camera=new THREE.PerspectiveCamera(54,16/9,.05,55);scene.add(camera);
 const target=new THREE.WebGLRenderTarget(960,540,{depthBuffer:true});target.texture.colorSpace=THREE.SRGBColorSpace;
 const geometries=new Set(),materials=new Set(),textures=new Set();let survivor,loadError=null,disposed=false,lastSample=sampleTeaser(0);
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82,...extra});materials.add(m);return m;};
 const wall=material(0x535d58),floor=material(0x293331),steel=material(0x242c2c,{metalness:.55,roughness:.5}),trim=material(0x111b1c),lightMat=material(0xaedbd0,{emissive:0x91bdb0,emissiveIntensity:1.4});
 const concreteCanvas=document.createElement('canvas');concreteCanvas.width=concreteCanvas.height=256;const grain=concreteCanvas.getContext('2d');grain.fillStyle='#8b948c';grain.fillRect(0,0,256,256);let seed=704;
 for(let i=0;i<10000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%256;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%256;grain.fillStyle=i%2?'#18211e12':'#d4dbce12';grain.fillRect(x,y,1+i%3,1);}
 const concreteMap=new THREE.CanvasTexture(concreteCanvas);concreteMap.colorSpace=THREE.SRGBColorSpace;concreteMap.wrapS=concreteMap.wrapT=THREE.RepeatWrapping;textures.add(concreteMap);wall.map=concreteMap;floor.map=concreteMap;
 function box(w,h,d,x,y,z,m=wall){const g=new THREE.BoxGeometry(w,h,d);geometries.add(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);scene.add(mesh);return mesh;}
 box(4.6,.2,23,0,-.12,-5,floor);box(.2,4.4,23,-2.35,2.1,-5);box(.2,4.4,23,2.35,2.1,-5);box(4.6,.15,23,0,4.3,-5,trim);
 for(let z=-15;z<6;z+=1.5){box(4.5,.012,.018,0,.002,z,trim);box(.04,.4,.22,-2.22,.6,z,steel);}
 for(const side of [-1,1]){box(.06,.8,22,side*2.22,.45,-5,steel);box(.04,.05,22,side*2.18,1.1,-5,trim);for(let z=-8;z<2;z+=4){box(.06,2.8,1.5,side*2.18,1.4,z,trim);box(.07,2.65,1.33,side*2.14,1.35,z,steel);box(.09,.12,.3,side*2.08,1.25,z+.4,lightMat);}}
 // The observation window frames the same horned head used in gameplay.
 const observationDoors=[];
 for(const side of [-1,1]){
  const group=new THREE.Group();scene.add(group);observationDoors.push(group);
  function leaf(w,h,d,x,y,z,m){const part=box(w,h,d,x,y,z,m);group.attach(part);return part;}
  leaf(2.06,2.65,.2,side*1.03,1.325,-11,steel);
  leaf(.12,1.22,.24,side*.06,3.26,-11,trim);leaf(.2,1.22,.24,side*1.98,3.26,-11,trim);
  for(const y of [2.65,3.87])leaf(2.06,.08,.28,side*1.03,y,-10.98,trim);
 }
 box(4.5,.42,.2,0,4.08,-11,steel);for(const x of [-2.2,2.2])box(.25,4.3,.35,x,2.15,-11,steel);
 box(4.5,4.4,.15,0,2.15,-15,wall);
 const red=material(0x863d27,{emissive:0x9d351c,emissiveIntensity:1});box(.1,.13,.08,1.82,1.5,-10.83,red);
 // Elevator and its clearly separate doors are visible in the opening shot.
 box(4.5,4.3,.2,0,2.1,5,trim);const doors=[box(1.03,3.2,.12,-.52,1.6,4.7,steel),box(1.03,3.2,.12,.52,1.6,4.7,steel)];
 box(.12,3.3,.28,-1.13,1.65,4.65);box(.12,3.3,.28,1.13,1.65,4.65);box(2.4,.15,.28,0,3.3,4.65,lightMat);
 function label(text,width,height){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#152323';g.fillRect(0,0,512,128);g.strokeStyle='#7e9b90';g.strokeRect(5,5,502,118);g.fillStyle='#d4dfcf';g.textAlign='center';g.font='bold 33px monospace';g.fillText(text,256,76);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);const m=new THREE.MeshBasicMaterial({map:t});materials.add(m);const geo=new THREE.PlaneGeometry(width,height);geometries.add(geo);const p=new THREE.Mesh(geo,m);scene.add(p);return p;}
 label('02 / OBSERVATION',1.7,.425).position.set(0,2.18,-10.88);const exitSign=label('SERVICE / EXIT',1.7,.425);exitSign.position.set(0,3.65,4.57);exitSign.rotation.y=Math.PI;
 scene.add(new THREE.HemisphereLight(0xb6d3cf,0x20291f,1.15));
 const lamps=[];for(const z of [2,-2.8,-7.6,-13]){box(1.4,.035,.24,0,4.15,z,lightMat);const l=new THREE.PointLight(0xaad2c6,21,8,2);l.position.set(0,3.9,z);scene.add(l);lamps.push(l);}
 const rim=new THREE.PointLight(0x82aaa3,17,6,2);rim.position.set(1.1,3.8,-14);scene.add(rim);
 const faceLight=new THREE.PointLight(0x839c92,2.2,5,2);faceLight.position.set(0,3.6,-11.7);scene.add(faceLight);
 const creature=createCreature();scene.add(creature.root);creature.root.position.z=-13.1;
 const bodyMat=material(0x050708);const old=new Set();creature.root.traverse(o=>{if(o.isMesh&&o.material.userData.creatureBody){old.add(o.material);o.material=bodyMat;}});old.forEach(m=>m.dispose());
 const mouthTexture=new THREE.TextureLoader().load(JUMPSCARE_MOUTH_URL);mouthTexture.colorSpace=THREE.SRGBColorSpace;textures.add(mouthTexture);const mouth=createJumpscareMouth(mouthTexture);creature.head.add(mouth);
 const torch=new THREE.Group();scene.add(torch);const barrel=box(.09,.09,.34,0,0,0,steel);torch.add(barrel);barrel.position.set(0,0,0);const lens=box(.075,.075,.01,0,0,0,lightMat);torch.add(lens);lens.position.z=-.18;
 const beam=new THREE.SpotLight(0xdce5c5,28,14,.42,.7,1.5);torch.add(beam,beam.target);beam.target.position.set(.2,-.1,-8);
 const titleCanvas=document.createElement('canvas');titleCanvas.width=1280;titleCanvas.height=720;const ctx=titleCanvas.getContext('2d');ctx.fillStyle='#020504';ctx.fillRect(0,0,1280,720);ctx.textAlign='center';ctx.fillStyle='#8c9c8d';ctx.font='18px monospace';ctx.fillText('RECOVERED FOOTAGE / END OF TRANSMISSION',640,228);ctx.fillStyle='#e4e7db';ctx.font='bold 82px sans-serif';ctx.fillText('MONOCHROME',590,365);ctx.fillStyle='#c29d68';ctx.fillText('II',985,365);ctx.fillRect(433,408,414,1);ctx.fillStyle='#ced4bf';ctx.font='25px monospace';ctx.fillText('DON’T TRUST THE VOICES.',640,469);
 const titleTex=new THREE.CanvasTexture(titleCanvas);titleTex.colorSpace=THREE.SRGBColorSpace;textures.add(titleTex);const titleMat=new THREE.MeshBasicMaterial({map:titleTex,depthTest:false,depthWrite:false,toneMapped:false});materials.add(titleMat);const titleGeo=new THREE.PlaneGeometry(2*Math.tan(54*Math.PI/360)*16/9,2*Math.tan(54*Math.PI/360));geometries.add(titleGeo);const title=new THREE.Mesh(titleGeo,titleMat);title.position.z=-1;title.renderOrder=100;camera.add(title);
 const ready=loadPlayerAvatarAsset().then(asset=>{if(disposed)return;survivor=createPlayerAvatar(asset,{id:'tape-survivor',slot:0,name:''});scene.add(survivor.root);}).catch(error=>{loadError=error;});
 const look=new THREE.Vector3();
 function sample(t,{reducedMotion=false}={}){
  const s=sampleTeaser(t);lastSample=s;const u=s.time;
  title.visible=s.shot==='title';creature.root.visible=u>=5&&u<20.4;scene.background.setHex(s.blackout?0x000000:0x060b0c);
  const z=u<5?4-u*1.1:u<11?-1.5-(u-5)*.91:u<15?-6.96:u<17?-6.96+(u-15)*.7:-5.56+(u-17)*2.6;
  survivor?.sampleCinematic({clip:u<11?'Walk':u<15?'Idle':u<17?'Walk':'Run',time:u<17?u:u*.9,position:[-.4,0,z],yaw:u<15?0:Math.PI});
  if(survivor)survivor.root.visible=u<20.4;
  applyIdle(creature,{sway:0,pitch:0,yaw:0,arm:0});creature.root.position.set(0,0,u<17.2?-13.1:-13.1+(u-17.2)*3.25);creature.root.rotation.set(0,0,0);
  if(u>=17)applyRunning(creature,(u-17)*.85,.9);
  if(u>=11&&u<15){creature.head.rotation.x=.06+Math.sin(u*2)*.018;creature.head.rotation.z=-.07;}
  mouth.visible=s.mouth>0&&!!mouthTexture.image;mouth.scale.set(1,.3+s.mouth,1);
  observationDoors.forEach((door,i)=>door.position.x=(i?1:-1)*THREE.MathUtils.smoothstep(u,17,17.6)*1.95);
  doors[0].position.x=-.52-Math.min(1,u/1.2);doors[1].position.x=.52+Math.min(1,u/1.2);
  for(let i=0;i<lamps.length;i++)lamps[i].intensity=u>=17&&u>17+(3-i)*.52?0:21;
  rim.intensity=u<17?17:8;faceLight.intensity=u>=17?1:2.2;
  torch.visible=u<20.4;
  const heldTorch=survivor?.root.getObjectByName('player-torch');
  if(u<19.6&&heldTorch){heldTorch.getWorldPosition(torch.position);heldTorch.getWorldQuaternion(torch.quaternion);torch.rotateY(Math.PI);}
  else {const drop=Math.max(0,u-19.6);torch.position.set(-.15,Math.max(.09,1.05-6*drop*drop),1.2+Math.min(.4,drop));torch.rotation.set(Math.min(1.3,drop*4),Math.PI,drop*3);}
  beam.intensity=u<20.4?28:0;
  if(u<2.5){camera.position.set(-1.8,1.5,-.5);look.set(0,1.45,3);}
  else if(u<5){camera.position.set(-1.75,1.6,1-u*.18);look.set(-.15,1.45,3-u*1.1);}
  else if(u<11){camera.position.set(1.65,2,-5.7-(u-5)*.16);look.set(0,2.7,-11.3);}
  else if(u<15){camera.position.set(.1,3.22,-10.1-(u-11)*.11);look.set(0,3.28,-13.1);}
  else if(u<19.6){camera.position.set(1.65,1.65,z+3.2);look.set(-.2,1.8,z-2);}
  else {camera.position.set(.75,.3,z+1.2);look.set(-.15,.6,z-.5);}
  if(!reducedMotion&&u>=17&&u<19.6){camera.position.y+=Math.sin(u*18)*.023;camera.position.x+=Math.sin(u*9)*.014;}
  camera.lookAt(look);scene.updateMatrixWorld(true);return s;
 }
 function render(renderer,t,options){const width=options?.quality==='low'?640:960;if(target.width!==width)target.setSize(width,width*9/16);sample(t,options);const oldTarget=renderer.getRenderTarget(),oldExposure=renderer.toneMappingExposure,oldAuto=renderer.autoClear;const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
  try{renderer.setRenderTarget(target);renderer.setViewport(0,0,target.width,target.height);renderer.setScissorTest(false);renderer.autoClear=true;renderer.toneMappingExposure=1.05;renderer.render(scene,camera);}finally{renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.toneMappingExposure=oldExposure;renderer.autoClear=oldAuto;}
 }
 function dispose(){if(disposed)return;disposed=true;survivor?.dispose();const gs=new Set(geometries),ms=new Set(materials);scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());target.dispose();}
 return {scene,camera,target,creature,mouth,ready,sample,render,dispose,get survivor(){return survivor;},get error(){return loadError;},get state(){return lastSample;}};
}
