import {createHouseServiceExit} from './house-service-exit.js';
import * as THREE from 'three';
import {createOpeningSet} from './opening-set.js';
import {createOpeningHands} from './opening-hands.js';
import {createHalloweenProps} from './halloween-props.js';
import {createFinaleSurvivor} from './finale-actors.js';
import {halloweenEndingFrame,endingEase as ease} from './halloween-ending-timeline.js';
/** The same furnished house, reached through a real rising passage and its original wall. */
export function createHalloweenEndingScene({asset,cast=[{id:'solo',slot:0}],runnerId=cast[0]?.id,reducedMotion=false,quality='auto'}={}){
 const scene=new THREE.Scene();scene.name='halloween-house-ending';scene.background=new THREE.Color(0x030606);scene.fog=new THREE.FogExp2(0x030606,.018);
 const camera=new THREE.PerspectiveCamera(61,1,.025,120);scene.add(camera);
 const set=createOpeningSet(scene),hands=createOpeningHands(camera,{hazmat:true}),decorations=createHalloweenProps({aged:true});
 set.passage.visible=false;set.houseFloor.visible=false;
 const route=new THREE.Group();route.name='house-maintenance-route';scene.add(route);
 const cube=new THREE.BoxGeometry(1,1,1),owned=[cube],materials=[];
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9,...extra});materials.push(m);return m;};
 const concrete=mat(0x3e493e),steel=mat(0x303b36,{metalness:.55,roughness:.65}),rust=mat(0x6b4932),black=mat(0x060b09),paint=mat(0x878878);
 function box(parent,w,h,d,x,y,z,m=concrete){const mesh=new THREE.Mesh(cube,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function text(parent,label,w,h,x,y,z){const c=document.createElement('canvas');c.width=768;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#20291f';ctx.fillRect(0,0,768,256);ctx.fillStyle='#c0baa0';ctx.textAlign='center';ctx.font='44px monospace';label.split('\n').forEach((s,i)=>ctx.fillText(s,384,100+i*65));const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;owned.push(map);return box(parent,w,h,.025,x,y,z,mat(0xffffff,{map}));}
 const slope=Math.atan2(5.4,32),ramp=new THREE.Group();ramp.position.set(0,-2.7,-27);ramp.rotation.x=-slope;route.add(ramp);
 box(ramp,2.7,.16,Math.hypot(32,5.4),0,-.08,0);box(ramp,2.7,.12,Math.hypot(32,5.4),0,2.8,0,black);
 for(const x of [-1.45,1.45])box(ramp,.2,3.2,Math.hypot(32,5.4),x,1.4,0);
 box(route,3.5,.16,5,0,-5.48,-45.5);for(const x of [-1.85,1.85])box(route,.2,3.1,5,x,-3.95,-45.5);
 for(const x of [-1.95,1.95])box(route,.2,3.5,3,x,1.65,-10.5);box(route,3.8,.15,3,0,3.45,-10.5,black);
 const exit=createHouseServiceExit();exit.root.position.set(0,-5.4,-44);exit.root.rotation.y=Math.PI;route.add(exit.root);const serviceDoor=exit.hinge;exit.update({banked:new Set([1,2,3,4])});
 const strip=mat(0xa7b392,{emissive:0x637c55,emissiveIntensity:.5});for(const z of [-42,-34,-26,-18]){const y=-5.4+(z+43)/32*5.4;box(route,.6,.035,.12,0,y+2.65,z,strip);const lamp=new THREE.PointLight(0x9da889,8,7,2);lamp.position.set(0,y+2.35,z);route.add(lamp);}
 for(const side of [-1,1]){
  const points=[[-44,-5.4],[-42,-5.23],[-30,-3.21],[-18,-1.18],[-11,0],[-9.25,0]].map(([z,y])=>new THREE.Vector3(side*1.28,y+1.95,z));
  const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.065,10,false);owned.push(geometry);const pipe=new THREE.Mesh(geometry,side<0?rust:steel);pipe.name='house-service-pipe';route.add(pipe);
  for(let z=-41;z<-10;z+=4){const y=-5.4+(z+43)/32*5.4,g=new THREE.TorusGeometry(.08,.015,6,14);owned.push(g);const ring=new THREE.Mesh(g,steel);ring.position.set(side*1.28,y+1.95,z);ring.rotation.x=-slope;route.add(ring);}
 }
 text(route,'HOUSE FEED →',.9,.23,-1.32,-3.8,-39).rotation.y=Math.PI/2;
 text(route,'THE WALL REMEMBERS',1.1,.25,1.83,1.65,-10.7).rotation.y=-Math.PI/2;
 // A real floor opening with a hinged rotten board at the front door.
 const floorMaterial=set.houseFloor.material;
 box(set.house,12,.14,7.2,0,-.08,-5.4,floorMaterial);box(set.house,12,.14,1,0,-.08,-.5,floorMaterial);
 for(const [x,w]of [[-3.225,5.55],[3.225,5.55]])box(set.house,w,.14,.8,x,-.08,-1.4,floorMaterial);
 box(set.house,1.05,.08,1,0,-.55,-1.4,black);
 const floorHinge=new THREE.Group();floorHinge.position.set(0,-.01,-1.8);set.house.add(floorHinge);box(floorHinge,.9,.12,.8,0,-.07,.4,floorMaterial);
 for(const side of [-1,1])box(set.house,.035,.07,.86,side*.48,-.1,-1.4,rust);
 const agedWood=mat(0x4b4635,{map:floorMaterial.map});const boards=new THREE.Group();boards.visible=false;set.street.add(boards);
 for(const side of [-1,1])for(let i=0;i<4;i++){const b=box(boards,2.15,.18,.1,side*3.35,1.2+i*.43,.32,i%2?rust:agedWood);b.rotation.z=side*(i%2?.12:-.06);}
 // Dead stems and leaves make the final house recognisably older, using shared geometry.
 for(let i=0;i<26;i++){const x=Math.sin(i*12.7)*5.4,z=1+(i%7)*.8,weed=box(boards,.035,.3+(i%4)*.09,.025,x,.13,z,rust);weed.rotation.z=Math.sin(i)*.35;}
 const pumpkin=decorations.pumpkin({scale:.65});pumpkin.position.set(0,4.15,.24);pumpkin.name='upstairs-pumpkin';set.street.add(pumpkin);
 const pumpkinLight=new THREE.PointLight(0xff8c24,0,2.5,2);pumpkinLight.position.set(0,4.53,.52);scene.add(pumpkinLight);
 const glowMaterials=[];pumpkin.traverse(o=>{if(o.material?.emissive)glowMaterials.push([o.material,o.material.emissiveIntensity]);});
 const originalColors=new Map(),originalEmissive=new Map();set.street.traverse(o=>{if(o.material?.color&&!originalColors.has(o.material)){originalColors.set(o.material,o.material.color.clone());if(o.material.emissive)originalEmissive.set(o.material,o.material.emissiveIntensity);}});
 const actors=new Map(cast.map(member=>[member.id,createFinaleSurvivor(asset,member)]));for(const actor of actors.values())scene.add(actor.root);
 let runnerHand=null;actors.get(runnerId)?.root.traverse(o=>{if(o.isBone&&/right.*hand$/i.test(o.name))runnerHand=o;});
 const ordered=[...cast].sort((a,b)=>(a.id===runnerId?1:b.id===runnerId?-1:a.slot-b.slot)),runner=actors.get(runnerId),helper=ordered.find(p=>p.id!==runnerId);
 const beam=new THREE.SpotLight(0xe4ead8,75,28,.55,.8,1.5),aim=new THREE.Object3D();beam.position.set(.22,-.18,-.52);aim.position.z=-15;camera.add(beam,aim);beam.target=aim;beam.castShadow=quality==='high';
 let disposed=false,aspect=1;const target=new THREE.Vector3();
 function resize(value){aspect=Math.max(.2,value);camera.aspect=aspect;camera.fov=aspect<.8?82:61;camera.updateProjectionMatrix();}
 function sample(seconds){
  const f=halloweenEndingFrame(seconds,{count:cast.length}),t=f.time;set.update(15,{reducedMotion});set.street.visible=true;set.house.visible=true;set.passage.visible=false;set.houseFloor.visible=false;route.visible=t<19;
  exit.setOpen(f.door);floorHinge.rotation.x=f.floorBreak*1.18;
  set.doorPivot.rotation.y=1.48*(1-ease(20,21,t)) +1.48*ease(33.5,35,t)*(1-ease(39.2,40,t));
  set.chair.position.set(2.95-ease(21,26,t)*1.1,.08,-4+ease(21,26,t)*.7);set.chair.rotation.z=.3+ease(21,26,t)*.5;
  set.houseLights.visible=t<43;set.pendant.intensity=55*(1-ease(20,27,t));if(!reducedMotion&&t>20&&t<20.12)set.pendant.intensity=65;
  boards.visible=f.aged>.05;for(const [m,value]of originalEmissive)m.emissiveIntensity=value*(1-f.aged);for(const [m,c]of originalColors)m.color.copy(c).lerp(new THREE.Color(0x4b5149),f.aged*.6);
  set.streetLights.traverse(o=>{if(o.isPointLight)o.intensity=23*(1-f.aged);});
  pumpkin.visible=t>=43;for(const [m,base]of glowMaterials)m.emissiveIntensity=base*f.pumpkinLight;pumpkinLight.intensity=9*f.pumpkinLight;
  const struggling=t>=27&&t<35,runnerAction=t<30&&t>=27?'snared':t>=30&&t<33?'snared':t>=33&&t<35?'free-leg':'none';
  const progress=t>=33?f.free:f.rescueReach;
  runner?.sample({clip:struggling?'Death':t>=20&&t<39?'Run':t>=10.5&&t<20?'Idle':'Walk',time:t,position:f.runner,yaw:Math.PI,action:runnerAction,progress,handTarget:struggling?(cast.length===1?[.86,1,-.55]:[-.5,1.05,-.95]):null});
  if(runner)runner.root.visible=!(t>=9.5&&t<18.5)&&t<43;
  let index=0;for(const member of ordered){if(member.id===runnerId)continue;const actor=actors.get(member.id),i=index++,isHelper=member.id===helper?.id;
   let position=[(i%2?1:-1)*(.55+i*.1),f.runner[1],f.runner[2]+1.4+i*.8],yaw=Math.PI,clip=t>=20?'Run':'Walk',contact=null,reach=0;
   if(struggling){position=[-.65+i*.7,0,isHelper?-.6:.8+i*.5];yaw=isHelper?0:Math.PI;clip='Idle';if(isHelper){contact=runnerHand?runnerHand.getWorldPosition(new THREE.Vector3()).toArray():[-.5,1.05,-.95];reach=f.rescueReach;}}
   if(t>=35){position=[(i%2?1:-1)*(.45+i*.2),0,f.runner[2]+1.2+i*.5];clip=t<39?'Run':'Walk';}
   actor.sample({clip,time:t,position,yaw,action:struggling?'brace':'none',progress:reach,handTarget:contact});actor.root.visible=t<43;
  }
  camera.position.fromArray(f.camera);target.fromArray(f.look);
  if(aspect<.8&&t>=27&&t<35)camera.position.add(new THREE.Vector3(.6,.2,1));
  if(!reducedMotion&&(t<10.5||t>=20&&t<27)){camera.position.y+=Math.sin(t*10)*.012;}
  camera.lookAt(target);camera.updateMatrixWorld(true);
  hands.update({time:t<10.5?15:26,reach:f.reach,torch:t<39?1:0,light:1});hands.left.visible=t>=10.5&&t<17;hands.root.visible=t<18.5;
  beam.intensity=t<10.5?65:t<18?8:t<39?65:0;
  scene.fog.density=t>=39?.008:.018;scene.updateMatrixWorld(true);return f;
 }
 function dispose(){if(disposed)return;disposed=true;for(const actor of actors.values())actor.dispose();hands.dispose();exit.dispose();decorations.dispose();set.dispose();owned.forEach(r=>r.dispose());materials.forEach(m=>m.dispose());beam.dispose();scene.clear();}
 return {scene,camera,set,route,serviceDoor,floorHinge,actors,pumpkinLight,sample,resize,dispose};
}
