export const MONOCHROME2_DURATION=80;

export const MONOCHROME2_DIALOGUE=[
 {id:'basement',at:.8,end:4.15,speaker:'LEAD',voice:'lead',text:'That whole Monochrome place was a nightmare. I cannot believe we got out.',rate:.92,pitch:.84},
 {id:'stairs',at:4.45,end:7.8,speaker:'RILEY',voice:'friend1',text:'That thing was right behind us. I could hear it on the stairs.',rate:.96,pitch:1.08},
 {id:'door',at:8.15,end:12.0,speaker:'JAMIE',voice:'friend2',text:'The door nearly shut on us. We only made it because we kept moving.',rate:.98,pitch:.98},
 {id:'escape',at:12.55,end:16.05,speaker:'LEAD',voice:'lead',text:'We did not stop until we were outside. That was our only chance.',rate:.92,pitch:.84},
 {id:'food',at:17.0,end:20.0,speaker:'RILEY',voice:'friend1',text:'Agreed. I just want real food. No more emergency rations.',rate:.98,pitch:1.08},
 {id:'supplies',at:20.45,end:23.35,speaker:'JAMIE',voice:'friend2',text:'Food and water first. Then we can work out what happens next.',rate:1.0,pitch:.98},
 {id:'water',at:27.2,end:30.0,speaker:'JAMIE',voice:'friend2',text:'I found water. I am grabbing a couple of bottles.',rate:1.0,pitch:.98},
 {id:'snacks',at:30.35,end:32.8,speaker:'RILEY',voice:'friend1',text:'I have snacks. Keep an eye out while I get these.',rate:.98,pitch:1.08},
 {id:'meet',at:33.05,end:35.45,speaker:'LEAD',voice:'lead',text:'Good. Meet me near the front. I will be right there.',rate:.94,pitch:.84},
 {id:'sound',at:40.45,end:42.25,speaker:'LEAD',voice:'lead',text:'Wait... did you hear that?',rate:.88,pitch:.82},
 {id:'light',at:43.0,end:44.7,speaker:'LEAD',voice:'lead',text:'There is a thin line of light running down this wall.',rate:.88,pitch:.82},
 {id:'wall',at:45.5,end:47.4,speaker:'LEAD',voice:'lead',text:'Something is on the other side. I can hear it.',rate:.86,pitch:.8}
];

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
export const monochrome2RampY=z=>Math.max(-2.62,Math.min(0,(z+29)*.238));

export function sampleMonochrome2Actors(value){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 const lead={x:0,y:0,z:14.8,yaw:0,clip:'Walk',action:'none',progress:0,headTurn:0,headTilt:0,torsoLean:0};
 if(time<18)lead.z=lerp(14.8,-13.5,time/18);
 else if(time<22)lead.z=lerp(-13.5,-19.3,(time-18)/4);
 else if(time<30)lead.z=lerp(-19.3,-27.5,(time-22)/8);
 else if(time<34){
  const p=smooth((time-30)/4);lead.x=lerp(0,2.38,p);lead.z=lerp(-27.5,-29,p);
 }else if(time<43.4){
  lead.x=2.38;lead.z=lerp(-29,-39.55,(time-34)/9.4);lead.y=monochrome2RampY(lead.z);
 }else if(time<44.2){
  lead.x=2.38;lead.z=lerp(-39.55,-39.92,(time-43.4)/.8);lead.y=monochrome2RampY(lead.z);
 }else if(time<45.2){
  lead.x=2.38;lead.z=-39.92;lead.y=-2.62;lead.clip='Idle';
  const p=smooth((time-44.2)/1);lead.headTurn=-1.0*p;lead.headTilt=-.58*p;
 }else if(time<46){
  lead.x=2.38;lead.z=-39.92;lead.y=-2.62;lead.clip='Idle';
  lead.headTurn=-1.0;lead.headTilt=-.58;
 }else if(time<47.2){
  lead.x=2.38;lead.z=-39.92;lead.y=-2.62;lead.clip='Idle';
  lead.headTurn=-1.0;lead.headTilt=-.5;lead.torsoLean=lerp(.02,.14,(time-46)/1.2);
  lead.handTarget=[2.58,-1.34,-40.11];lead.handProgress=smooth((time-46)/1.2);
 }else if(time<48.4){
  lead.x=2.38;lead.z=-39.92;lead.y=-2.62;lead.clip='Idle';
  lead.headTurn=-.88;lead.headTilt=-.4;lead.torsoLean=lerp(.14,.48,(time-47.2)/1.2);
  lead.handTarget=[2.58,-1.34,-40.11];lead.handProgress=1;
 }else if(time<51.4){
  const p=smooth((time-48.4)/3);
  lead.x=lerp(2.38,2.55,p);lead.z=lerp(-39.92,-45.3,p);lead.y=-2.62;
  lead.clip='Death';lead.action='dive';lead.progress=p;
 }else if(time<53.5){
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Death';lead.action='prone';
 }else if(time<58.1){
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Death';lead.action='get-up';
  lead.progress=smooth((time-53.5)/4.6);
 }else{
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Idle';
 }

 const friend1={x:-.82,y:0,z:15.2,yaw:0,clip:'Walk'};
 if(time<18)friend1.z=lerp(15.2,-13.2,time/18);
 else if(time<22)friend1.z=lerp(-13.2,-20.2,(time-18)/4);
 else if(time<27){
  const p=smooth((time-22)/5);friend1.x=lerp(-.82,-3.2,p);friend1.z=lerp(-20.2,-24.9,p);
 }else{
  friend1.x=-3.2;friend1.z=-24.9;friend1.yaw=Math.PI/2;friend1.clip='Idle';
  if(time>=29&&time<32.6){friend1.handTarget=[-3.55,1.27,-24.2];friend1.handProgress=smooth((time-29)/1.45);}
 }

 const friend2={x:.82,y:0,z:15.9,yaw:0,clip:'Walk'};
 if(time<18)friend2.z=lerp(15.9,-12.6,time/18);
 else if(time<22)friend2.z=lerp(-12.6,-20,(time-18)/4);
 else if(time<31){
  const p=smooth((time-22)/9);friend2.x=lerp(.82,3.15,p);friend2.z=lerp(-20,-28.1,p);
 }else{
  friend2.x=3.15;friend2.z=-28.1;friend2.yaw=Math.PI/2;friend2.clip='Idle';
  if(time>=29.2&&time<32.8){friend2.handTarget=[3.45,1.22,-28.62];friend2.handProgress=smooth((time-29.2)/1.45);}
 }
 return [lead,friend1,friend2];
}

export function sampleMonochrome2(value){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 let shot='street';
 if(time>=18&&time<22)shot='storefront';
 else if(time>=22&&time<34)shot='store';
 else if(time>=34&&time<43.4)shot='rear-ramp';
 else if(time>=43.4&&time<45.2)shot='ear-listen';
 else if(time>=45.2&&time<46)shot='face-closeup';
 else if(time>=46&&time<47.2)shot='hand-reach';
 else if(time>=47.2&&time<48.4)shot='lean-wall';
 else if(time>=48.4&&time<51.4)shot='fall-through';
 else if(time>=51.4&&time<53.5)shot='floor';
 else if(time>=53.5&&time<58.1)shot='get-up';
 else if(time>=58.1&&time<62)shot='backrooms-reveal';
 else if(time>=62&&time<64.5)shot='fade-black';
 else if(time>=64.5&&time<66)shot='title-main';
 else if(time>=66)shot='title-subtitle';

 const crack=time<38?0:time<43.4?.72:time<47.05?.86:time<47.45?.86*(1-smooth((time-47.05)/.4)):0;
 const fallThrough=smooth((time-48.4)/.85);
 const backrooms=smooth((time-48.4)/1.2);
 const getUp=smooth((time-53.5)/4.6);
 const reveal=smooth((time-53.5)/5.5);
 const fade=smooth((time-62)/2.5);
 const titleMain=smooth((time-64.5)/1.15);
 const titleSubtitle=smooth((time-66)/1.2);
 return {time,shot,crack,fallThrough,backrooms,getUp,reveal,fade,titleMain,titleSubtitle,ended:time>=MONOCHROME2_DURATION};
}
