import * as T from 'three';
import {finaleShot,FINALE_DURATION} from './finale-state.js';
import {createFinaleSet} from './finale-set.js';
import {createFinaleSurvivor,createFinaleCreature} from './finale-actors.js';
const smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b),mix=T.MathUtils.lerp;
const stairHeight=z=>3.6*T.MathUtils.clamp((8-z)/6,0,1);
export function createFinaleScene({asset,cast,runnerId,buttonId,reducedMotion=false,quality='auto'}){
 const scene=new T.Scene();scene.background=new T.Color(0x070c0e);scene.fog=new T.FogExp2(0x101918,.027);
 const camera=new T.PerspectiveCamera(58,1,.045,100),set=createFinaleSet({quality}),creature=createFinaleCreature();scene.add(set.root,creature.root);
 const actors=new Map(cast.map(member=>[member.id,createFinaleSurvivor(asset,member)]));for(const a of actors.values())scene.add(a.root);
 const ambient=new T.HemisphereLight(0x9bb4b6,0x12150e,.5);scene.add(ambient);
 const key=new T.SpotLight(0xc6d9d0,60,28,.9,.8,1.5);key.position.set(2,3.7,10);key.castShadow=quality!=='low';key.shadow.mapSize.set(512,512);scene.add(key,key.target);
 const rim=new T.PointLight(0x8ba7af,12,12,2);scene.add(rim);
 const sun=new T.DirectionalLight(0xf2ecd3,0);sun.position.set(-6,12,10);scene.add(sun);
 let aspect=1,disposed=false;const target=new T.Vector3();
 function resize(value){aspect=Math.max(.2,value);camera.aspect=aspect;camera.fov=aspect<.8?72:58;camera.updateProjectionMatrix();}
 function sample(seconds){
  const t=Math.max(0,Math.min(FINALE_DURATION,Number.isFinite(seconds)?seconds:0)),shot=finaleShot(t).name;set.sample(t);
  const cabY=set.cab.position.y,epilogue=t>=44,rise=epilogue?0:cabY-3.6;
  scene.background.setHex(epilogue?0xb9c5bd:0x070c0e);scene.fog.color.copy(scene.background);scene.fog.density=epilogue?.018:.027;sun.intensity=epilogue?2.5:0;ambient.intensity=epilogue?2.2:.5;
  let z=40-3.2*Math.max(0,t-2),height=0,action='none',progress=0,clip='Run',yaw=0,x=0;
  if(t>=12){z=mix(8,.7,T.MathUtils.clamp((t-12)/7,0,1));height=stairHeight(z);}
  if(t>=19){const d=T.MathUtils.clamp((t-19)/2.2,0,1);z=mix(.7,-2.25,d);height=3.6+Math.sin(d*Math.PI)*.5;x=-1.05*d;action='dive';progress=d;}
  if(t>=21.2){z=-2.25;height=cabY;x=-1.05;action=t>=30?'brace':'none';clip='Idle';}
  if(epilogue){const walk=Math.max(0,t-45.5);z=-2.25+walk*.9;height=0;x=-.48;action='none';clip=walk>0?'Walk':'Idle';yaw=Math.PI;}
  const runner=actors.get(runnerId);runner?.sample({clip,time:t,position:[x,height,z],yaw,action,progress});
  let extra=0;
  for(const [id,a] of actors){if(id===runnerId)continue;
   let p=id===buttonId?[1.2,cabY,-.95]:[extra++%2? .65:-.98,cabY,-2.6];let role='none',contact=null,w=0,face=id===buttonId?-Math.PI/2:Math.PI,actorClip='Idle';
   if(id===buttonId&&t>=21.2&&t<23.4){role='press';w=smooth(21.3,22.1,t)*(1-smooth(22.7,23.4,t));contact=[1.515,cabY+1.3,-.65];}
   else if(t>=30&&!epilogue)role='brace';
   if(epilogue){const index=cast.findIndex(member=>member.id===id),walk=Math.max(0,t-45.5-index*.15);p=[index%2?.52:-.6,0,-2.5+walk*.9-Math.floor(index/2)*.6];face=Math.PI;actorClip=walk>0?'Walk':'Idle';role='none';}
   a.sample({clip:actorClip,time:t,position:p,yaw:face,action:role,progress:w,handTarget:contact});
  }
  if(buttonId===runnerId&&t>=21.2&&t<23.4)runner?.sample({clip:'Idle',time:t,position:[1.2,cabY,-.95],yaw:-Math.PI/2,action:'press',progress:smooth(21.3,22.1,t)*(1-smooth(22.7,23.4,t)),handTarget:[1.515,cabY+1.3,-.65]});
  let monsterZ=z+mix(3.3,1.8,smooth(2,12,t)),monsterHeight=stairHeight(monsterZ);
  const mode=t<23?'chase':t<35.3?'trapped':t<39.3?'severed':'dead';
  if(t>=19){monsterZ=mix(2.5,.65,smooth(19,23,t));monsterHeight=mix(3.6,3.1,smooth(21,23,t))+rise;}
  creature.sample({time:t,mode,position:[0,monsterHeight,monsterZ],yaw:Math.PI,neckPosition:[0,cabY+1.72,-.08],deathTime:Math.max(0,t-35.3)});creature.root.visible=!epilogue;
  if(t<12){camera.position.set(3.2,.95,z-4.5);target.set(0,1.65,z+1.4);key.position.set(-2.4,3.6,z-2);key.target.position.set(0,1.2,z+1);rim.position.set(0,2.8,monsterZ+1);}
  else if(t<19){camera.position.set(-1.1,5.08,-2.7);target.set(0,height+1.2,z+.7);key.position.set(-1.2,6,1);key.target.position.set(0,4,4);rim.position.set(0,5.6,4);}
  else if(t<21.2){camera.position.set(-1.22,5.05,-3.1);target.set(0,4.9,z+.4);key.position.set(-1.2,6,1);key.target.position.set(0,4.8,0);rim.position.set(0,6,1);}
  else if(t<23){camera.position.set(.05,cabY+1.4,-.12);target.set(1.48,cabY+1.31,-.65);key.position.set(.2,cabY+2.5,-1.5);key.target.position.copy(target);}
  else if(t<35.3){camera.position.set(-.12,cabY+1.7,-2.65);target.set(0,cabY+2.05,-.08);key.position.set(-1,cabY+2.7,-1.9);key.target.position.copy(target);rim.position.set(0,cabY+2.2,.8);}
  else if(t<39){const drop=smooth(35.4,37,t);camera.position.set(-.85,cabY+mix(1.6,.7,drop),-2.35);target.copy(creature.head.position);target.y+=.15;key.position.set(-1,cabY+2.7,-1.9);key.target.position.copy(target);}
  else if(t<44){const lift=smooth(41,44,t);camera.position.set(-.85,cabY+mix(.75,1.65,lift),-1.9);target.set(.28,cabY+mix(.18,1.55,lift),mix(-.6,-2.6,lift));key.position.set(-1,cabY+2.7,-1.9);key.target.position.copy(target);}
  else {camera.position.set(.05,1.35,8.5+(t-44)*.13);target.set(0,1.25,mix(-1,3,smooth(44,52,t)));key.intensity=0;rim.intensity=0;}
  if(!epilogue){key.intensity=60;rim.intensity=12;}
  if(aspect<.8&&t<12)camera.position.x*=1.25;
  if(!reducedMotion&&t>=2&&t<21.2){camera.position.y+=Math.sin(t*18)*.025;camera.position.x+=Math.sin(t*9)*.012;}
  if(!reducedMotion&&t>=23&&t<35.6)camera.position.x+=Math.sin(t*39)*.008*(t<24?2:1);
  camera.lookAt(target);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  const fade=t<2?1-smooth(.4,2,t):t>42.5&&t<45.2?(t<44?smooth(42.5,44,t):1-smooth(44,45.2,t)):0;
  return {shot,fade,title:t>=49?['YOU ESCAPED.',...(t>=50.2?['TOGETHER.']:[])]:[],complete:t>=52};
 }
 function dispose(){if(disposed)return;disposed=true;for(const a of actors.values())a.dispose();creature.dispose();set.dispose();key.dispose();scene.clear();}
 return {scene,camera,set,creature,actors,sample,resize,dispose};
}
