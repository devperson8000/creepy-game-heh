export const MONOCHROME2_DURATION=78;

export const MONOCHROME2_DIALOGUE=[
 {id:'basement',at:.8,end:4.15,speaker:'LEAD',voice:'lead',text:'That place was a nightmare. We made it out.',rate:.97,pitch:1},
 {id:'stairs',at:4.45,end:7.8,speaker:'RILEY',voice:'friend1',text:'It was right behind us. I heard it coming.',rate:.98,pitch:1},
 {id:'door',at:8.15,end:12.0,speaker:'JAMIE',voice:'friend2',text:'That door almost shut. We just kept moving.',rate:.98,pitch:1},
 {id:'escape',at:12.55,end:16.05,speaker:'LEAD',voice:'lead',text:'We did not stop until we got outside.',rate:.97,pitch:1},
 {id:'food',at:17.0,end:20.0,speaker:'RILEY',voice:'friend1',text:'I just want real food. No more rations.',rate:.98,pitch:1},
 {id:'supplies',at:20.45,end:23.35,speaker:'JAMIE',voice:'friend2',text:'Food and water first. Then we decide.',rate:.98,pitch:1},
 {id:'water',at:27.2,end:30.0,speaker:'JAMIE',voice:'friend2',text:'Found water. Taking a few bottles.',rate:.98,pitch:1},
 {id:'snacks',at:30.35,end:32.8,speaker:'RILEY',voice:'friend1',text:'Snacks here. Keep watch while I grab them.',rate:.98,pitch:1},

];

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const STAIR_COUNT=12,STAIR_START_Z=-29,STAIR_END_Z=-39.92;
const STAIR_RUN=(STAIR_START_Z-STAIR_END_Z)/STAIR_COUNT;
const STAIR_RISE=2.62/STAIR_COUNT;

// The feet stay on each tread, with a small, eased drop at the front edge.
export function monochrome2RampY(z){
 const progress=clamp((STAIR_START_Z-z)/STAIR_RUN,0,STAIR_COUNT);
 const index=Math.min(STAIR_COUNT,Math.floor(progress));
 return -STAIR_RISE*index;
}

export function monochrome2FootPlantOffset(footPositions,targetClearance=.105){
 if(!Array.isArray(footPositions)||!footPositions.length)return 0;
 let lowest=Infinity;
 for(const foot of footPositions){
  if(!Array.isArray(foot)||foot.length<3||!foot.every(Number.isFinite))continue;
  lowest=Math.min(lowest,foot[1]-monochrome2RampY(foot[2]));
 }
 if(!Number.isFinite(lowest))return 0;
 return clamp(targetClearance-lowest,0,.42);
}

export function monochrome2CrackVisibility(timelineStrength,distanceToWall){
 const nearWall=smooth((2.35-Math.max(0,distanceToWall))/.55);
 return clamp(timelineStrength,0,1)*nearWall;
}

export function sampleMonochrome2Actors(value){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 const lead={x:0,y:0,z:14.8,yaw:0,clip:'Walk',action:'none',progress:0,headTurn:0,headTilt:0,torsoLean:0,crouch:0};
 if(time<18)lead.z=lerp(14.8,-13.5,time/18);
 else if(time<22)lead.z=lerp(-13.5,-19.3,(time-18)/4);
 else if(time<30)lead.z=lerp(-19.3,-27.5,(time-22)/8);
 else if(time<34){
  const p=smooth((time-30)/4);lead.x=lerp(0,2.1,p);lead.z=lerp(-27.5,-29,p);
 }else if(time<43.4){
  lead.x=2.1;lead.z=lerp(STAIR_START_Z,-39.55,(time-34)/9.4);lead.y=monochrome2RampY(lead.z);
 }else if(time<44.2){
  lead.x=2.1;lead.z=lerp(-39.55,-39.92,(time-43.4)/.8);lead.y=-2.62;
 }else if(time<45.2){
  lead.x=2.1;lead.z=-39.92;lead.y=-2.62;lead.clip='Idle';
  const p=smooth((time-44.2)/1);lead.headTurn=-1.0*p;lead.headTilt=-.58*p;
 }else if(time<46){
  lead.x=2.1;lead.z=-39.92;lead.y=-2.62;lead.clip='Idle';
  lead.headTurn=-1.0;lead.headTilt=-.58;
 }else if(time<47.2){
  lead.x=2.1;lead.z=-39.92;lead.y=-2.62;lead.clip='Idle';
  lead.headTurn=-1.0;lead.headTilt=-.5;lead.torsoLean=lerp(.02,.14,(time-46)/1.2);
  lead.handTarget=[2.58,-1.34,-40.11];lead.handProgress=smooth((time-46)/1.2);
 }else if(time<49.05){
  lead.x=2.1;lead.z=-39.92;lead.y=-2.62;lead.clip='Idle';
  lead.headTurn=-.88;lead.headTilt=-.4;lead.torsoLean=lerp(.14,.48,(time-47.2)/1.85);
  lead.handTarget=[2.58,-1.34,-40.11];lead.handProgress=1;
 }else if(time<50.35){
  const p=smooth((time-49.05)/1.3);
  lead.x=lerp(2.1,2.55,p);lead.z=lerp(-39.92,-45.3,p);lead.y=-2.62;
  lead.clip='Death';lead.action='dive';lead.progress=p;
 }else if(time<53){
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Death';lead.action='prone';
 }else if(time<59){
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Death';lead.action='get-up';
  lead.progress=smooth((time-53)/6);
 }else{
  const scan=Math.max(0,time-60);
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Idle';
  lead.headTurn=Math.sin(scan*1.72)*.42;
  lead.headTilt=Math.sin(scan*.93+.6)*.09;
  lead.torsoLean=.16;lead.crouch=.28*smooth((time-58.6)/1.25);
 }

 const friend1={x:-.82,y:0,z:15.2,yaw:0,clip:'Walk'};
 if(time<18)friend1.z=lerp(15.2,-13.2,time/18);
 else if(time<22)friend1.z=lerp(-13.2,-20.2,(time-18)/4);
 else if(time<27){
  // Riley approaches the left rack from the open aisle, not through its shelves.
  const p=smooth((time-22)/5);friend1.x=lerp(-.82,-2.0,p);friend1.z=lerp(-20.2,-24.2,p);
 }else if(time<32.6){
  friend1.x=-2.0;friend1.z=-24.2;friend1.yaw=Math.PI/2;friend1.clip='Idle';
  // Her hand meets the near edge of the shelf while her body stays in the aisle.
  if(time>=29){friend1.handTarget=[-2.72,1.27,-24.08];friend1.handProgress=smooth((time-29)/1.45);}
 }else if(time<33.1){
  friend1.x=-2.0;friend1.z=-24.2;friend1.yaw=Math.PI/2;friend1.clip='Idle';
  friend1.handTarget=[-2.72,1.27,-24.08];friend1.handProgress=1-smooth((time-32.6)/.5);
 }else{
  friend1.x=-2.0;friend1.z=-24.2;friend1.yaw=Math.PI/2;friend1.clip='Idle';
 }

 const friend2={x:.82,y:0,z:15.9,yaw:0,clip:'Walk'};
 if(time<18)friend2.z=lerp(15.9,-12.6,time/18);
 else if(time<22)friend2.z=lerp(-12.6,-20,(time-18)/4);
 else if(time<29.2){
  // Jamie uses the clear west side of the right-hand shelving unit.
  const p=smooth((time-22)/7.2);friend2.x=lerp(.82,1.9,p);friend2.z=lerp(-20,-28.8,p);
 }else if(time<30.9){
  friend2.x=1.9;friend2.z=-28.8;friend2.yaw=-Math.PI/2;friend2.clip='Idle';
  if(time>=29.2){friend2.handTarget=[2.68,1.22,-28.66];friend2.handProgress=smooth((time-29.2)/1.45);}
 }else if(time<31.35){
  friend2.x=1.9;friend2.z=-28.8;friend2.yaw=-Math.PI/2;friend2.clip='Idle';
  friend2.handTarget=[2.68,1.22,-28.66];friend2.handProgress=1-smooth((time-30.9)/.45);
 }else if(time<32.35){
  // Clear the shelf front before moving away; this also keeps the stair aisle free.
  const p=smooth((time-31.35)/1);friend2.x=1.9;friend2.z=lerp(-28.8,-27.2,p);
  friend2.yaw=-Math.PI/2;friend2.clip='Walk';
 }else if(time<34.35){
  const p=smooth((time-32.35)/2);friend2.x=lerp(1.9,3.75,p);friend2.z=lerp(-27.2,-26.3,p);
  friend2.yaw=lerp(-Math.PI/2,0,p);friend2.clip='Walk';
 }else{
  friend2.x=3.75;friend2.z=-26.3;friend2.yaw=0;friend2.clip='Idle';
 }
 return [lead,friend1,friend2];
}

export const MONOCHROME2_STAIR_OPENING=Object.freeze({
 left:1.0,right:3.84,front:-29,back:-36.2
});

export function monochrome2ShopDoorOpen(value){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 return smooth((time-18)/1.15)*(1-smooth((time-24)/1.05));
}

export function monochrome2NoclipCueGain(value,duck=1){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 const intro=smooth((time-46.55)/.65);
 const blackFade=smooth((time-65.6)/2.9);
 return .72*intro*clamp(duck,0,1)*(1-blackFade);
}

// Full-frame cuts to the real Level Zero map. The opening flash lasts 0.15s;
// later flashes are deliberately sparse so the first one is the clear standout.
const BACKROOMS_BACKGROUND_FLASHES = Object.freeze([
 [0,.15],
 [4.8,.15],
 [13.6,.15],
 [26.2,.15],
 [43.4,.15]
]);
export function monochrome2BackroomsBackgroundFlash(value){
 const time=Number.isFinite(value)?value:0;
 return BACKROOMS_BACKGROUND_FLASHES.some(([start,duration])=>time>=start&&time<start+duration);
}

export function sampleMonochrome2(value){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 let shot='street';
 if(time>=18&&time<22)shot='storefront';
 else if(time>=22&&time<34)shot='store';
 else if(time>=34&&time<43.4)shot='rear-stairs';
 else if(time>=43.4&&time<45.2)shot='ear-listen';
 else if(time>=45.2&&time<46)shot='face-closeup';
 else if(time>=46&&time<47.2)shot='hand-reach';
 else if(time>=47.2&&time<49.05)shot='lean-wall';
 else if(time>=49.05&&time<50.35)shot='fall-through';
 else if(time>=50.35&&time<53)shot='floor-pan';
 else if(time>=53&&time<59)shot='get-up';
 else if(time>=59&&time<63.6)shot='cautious-scan';
 else if(time>=63.6&&time<65.6)shot='monochrome-run';
 else if(time>=65.6&&time<68.5)shot='fade-black';
 else if(time>=68.5&&time<69.8)shot='title-main';
 else if(time>=69.8)shot='title-subtitle';

 const crack=time<42?0:time<46.1?.42:time<46.32?.42*(1-smooth((time-46.1)/.22)):0;
 const fallThrough=smooth((time-49.05)/.32);
 const backrooms=smooth((time-49.4)/.42);
 const reveal=smooth((time-50.35)/3);
 const monochromeRun=clamp((time-63.6)/1.5,0,1);
 const monochromeActive=time>=63.6&&time<65.1;
 const fade=smooth((time-65.6)/2.9);
 const titleMain=smooth((time-68.5)/1.15);
 const titleSubtitle=smooth((time-69.8)/1.1);
 return {time,shot,crack,fallThrough,backrooms,reveal,monochromeRun,monochromeActive,fade,titleMain,titleSubtitle,ended:time>=MONOCHROME2_DURATION};
}
