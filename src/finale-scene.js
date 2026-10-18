import * as THREE from 'three';
import {finaleShot,FINALE_DURATION} from './finale-state.js';
import {createFinaleSet} from './finale-set.js';
import {createFinaleSurvivor,createFinaleCreature} from './finale-actors.js';
const clamp=(t)=>THREE.MathUtils.clamp(t,0,1);
const ease=t=>{const x=clamp(t);return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*clamp(t);
export function createFinaleScene({asset,cast,runnerId,buttonId,reducedMotion=false,quality='auto'}={}){
 if(!asset?.scene||!Array.isArray(cast)||!cast.length)throw new Error('Finale needs the survivor model and cast.');
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x060909);scene.fog=new THREE.FogExp2(0x090f0d,.018);
 const camera=new THREE.PerspectiveCamera(58,1,.05,140);
 const set=createFinaleSet({quality});scene.add(set.root);
 scene.add(new THREE.AmbientLight(0xa1b5ac,.65));
 const key=new THREE.DirectionalLight(0xdfe9db,2);key.position.set(-4,8,2);scene.add(key);
 const players=new Map();
 for(const member of cast){const actor=createFinaleSurvivor(asset,member);players.set(member.id,actor);scene.add(actor.root);}
 const creature=createFinaleCreature();scene.add(creature.root);
 let disposed=false,aspect=1;
 function resize(value){
  aspect=Number.isFinite(value)&&value>0?value:1;
  camera.aspect=aspect;camera.fov=aspect<.8?72:58;camera.updateProjectionMatrix();
 }
 function sample(value){
  if(disposed)return {shot:'daylight',fade:1,title:null,complete:true};
  const t=THREE.MathUtils.clamp(Number.isFinite(value)?value:0,0,FINALE_DURATION),shot=finaleShot(t);
  set.sample(t);
  const runner=players.get(runnerId)??players.values().next().value;
  const button=players.get(buttonId)??runner;
  const rise=t<=30?0:5*ease((t-30)/5);
  const phase=shot.name;
  let x=0,y=1.8,z=0,tx=0,ty=1.55,tz=0;
  if(t<12){
   const p=ease((t-2)/10),rZ=lerp(36,12,p);
   for(const [id,actor] of players){
    const active=actor===runner;actor.sample({clip:active?'run':'idle',time:t,position:{x:active?0:(actor===button?-1:1),y:0,z:active?rZ:-2.8},yaw:active?0:Math.PI});
   }
   creature.sample({time:t,mode:'chase',position:{x:.6,y:0,z:rZ+5.8-2*p},yaw:Math.PI});
   [x,y,z,tx,ty,tz]=[3.4,2.3,rZ+10,0,1.7,rZ-3];
  }else if(t<19){
   const p=ease((t-12)/7),rZ=lerp(12,1.8,p);
   for(const [id,actor] of players){const active=actor===runner;actor.sample({clip:active?'stairs':'idle',time:t,position:{x:active?.05:id===buttonId?-.9:1,y:active?.08+.2*p:0,z:active?rZ:-3},yaw:active?0:Math.PI});}
   creature.sample({time:t,mode:'chase',position:{x:.5,y:0,z:rZ+4},yaw:Math.PI});
   [x,y,z,tx,ty,tz]=[2.8,2.7,7.3,0,1.65,-1.4];
  }else if(t<23){
   const p=ease((t-19)/4);
   for(const [id,actor] of players){
    const active=actor===runner,press=actor===button;
    actor.sample({clip:active?'dive':press?'button':'brace',time:t,progress:p,position:{x:active?-.15:press?1.15:-1,y:0,z:active?lerp(1.6,-2.3,p):press?-1.4:-3.3},yaw:active?0:Math.PI/2,handTarget:press?{x:1.82,y:1.42,z:-1.25}:null});
   }
   creature.sample({time:t,mode:'chase',position:{x:.4,y:0,z:3.6-2.4*p},yaw:Math.PI});
   [x,y,z,tx,ty,tz]=t<20.5?[2,2.5,3,.0,1.3,-2]:[2.5,2.0,-.3,1.7,1.4,-1.25];
  }else if(t<44){
   for(const [id,actor] of players){
    actor.sample({clip:'brace',time:t,position:{x:id===runnerId?-.65:id===buttonId?1.1:-1.4,y:rise,z:id===runnerId?-2.3:id===buttonId?-1.7:-3.4},yaw:Math.PI});
   }
   if(t<35)creature.sample({time:t,mode:'trapped',position:{x:0,y:rise,z:.8},yaw:Math.PI});
   else creature.sample({time:t-35,mode:t>=39?'dead':'defeated',position:{x:0,y:rise,z:1.1},yaw:Math.PI});
   creature.root.visible=t<40;
   if(t<30)[x,y,z,tx,ty,tz]=[1.15,2.3,-3.9,0,1.7,.65];
   else if(t<35)[x,y,z,tx,ty,tz]=[3.8,2.5+rise,-1.7,0,1.7+rise,-1.5];
   else [x,y,z,tx,ty,tz]=[1.1,2.45+rise,-4.1,0,1.8+rise,-1.7];
  }else{
   for(const [index,[id,actor]] of [...players].entries()){
    const p=ease((t-44)/8);
    actor.sample({clip:p<.9?'run':'idle',time:t,position:{x:(index-(players.size-1)/2)*1.22,y:0,z:lerp(-6,-12,p)},yaw:0});
   }
   creature.root.visible=false;
   [x,y,z,tx,ty,tz]=[3.3,2.5,-14,0,1.55,-8];
  }
  // The body stays on screen only until the elevator's mechanical reversal.
  if(t<23)creature.root.visible=true;
  if(t>=35&&t<39)creature.root.scale.setScalar(Math.max(.15,1-(t-35)/4*.8));
  camera.position.set(x,y,z);camera.lookAt(tx,ty,tz);
  if(!reducedMotion&&t>=23&&t<36){camera.position.x+=Math.sin(t*33)*.018;camera.position.y+=Math.sin(t*27)*.012;}
  scene.background.setHex(t>=44?0xb9c9c1:0x060909);
  scene.fog.color.setHex(t>=44?0xaabcb4:0x090f0d);
  const fade=t<2?1-ease(t/2):t>=42&&t<44?ease((t-42)/2):t>=44&&t<45?1-ease(t-44):0;
  const title=t>=45&&t<48?'YOU ESCAPED.':t>=48?'TOGETHER.':null;
  return {shot:shot.name,fade,title,complete:t>=FINALE_DURATION};
 }
 function dispose(){if(disposed)return;disposed=true;for(const actor of players.values())actor.dispose();creature.dispose();set.dispose();}
 resize(1);sample(0);
 return {scene,camera,set,players,creature,sample,resize,dispose};
}
