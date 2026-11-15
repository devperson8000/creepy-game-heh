export const MONOCHROME2_DURATION=66;

export const MONOCHROME2_DIALOGUE=[
 {id:'check-in',at:1.05,end:4.15,speaker:'LEAD',voice:'lead',text:'We made it out. Everyone okay?',rate:.92,pitch:.94},
 {id:'elevator',at:5.6,end:8.85,speaker:'RILEY',voice:'friend1',text:'Yeah. I never want to see that elevator again.',rate:.94,pitch:1.04},
 {id:'food',at:10.0,end:12.55,speaker:'JAMIE',voice:'friend2',text:'Can we find food before we start walking again?',rate:.93,pitch:1.08},
 {id:'shop',at:24.15,end:26.25,speaker:'RILEY',voice:'friend1',text:'There is a shop. No way.',rate:.95,pitch:1.04},
 {id:'supplies',at:29.15,end:31.95,speaker:'LEAD',voice:'lead',text:'Let us get some supplies. Then we will work out where we are.',rate:.9,pitch:.94},
 {id:'water',at:32.15,end:34.3,speaker:'JAMIE',voice:'friend2',text:'I am grabbing water. You two want anything?',rate:.94,pitch:1.08},
 {id:'sweet',at:34.45,end:35.85,speaker:'RILEY',voice:'friend1',text:'Something sweet, please.',rate:.96,pitch:1.04},
 {id:'catch-up',at:36.0,end:37.3,speaker:'LEAD',voice:'lead',text:'I will catch up.',rate:.91,pitch:.94},
 {id:'light',at:48.65,end:50.3,speaker:'LEAD',voice:'lead',text:'Wait... what was that?',rate:.86,pitch:.9},
 {id:'wall',at:50.65,end:53.45,speaker:'LEAD',voice:'lead',text:'I can hear something. There is something behind this wall.',rate:.86,pitch:.9},
 {id:'lost',at:58.1,end:60.15,speaker:'JAMIE',voice:'friend2',text:'Hey? Where did you go?',rate:.88,pitch:1.08}
];

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const rampY=z=>Math.max(-2.62,Math.min(0,(z+29)*.238));

export function sampleMonochrome2Actors(value){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 const lead={x:0,y:0,z:14.8,yaw:0,clip:'Walk',action:'none',progress:0};
 if(time<7)lead.z=lerp(14.8,4,time/7);
 else if(time<24)lead.z=lerp(4,-14,(time-7)/17);
 else if(time<29)lead.z=lerp(-14,-20,(time-24)/5);
 else if(time<37.5)lead.z=lerp(-20,-29,(time-29)/8.5);
 else if(time<48.5){
  const p=smooth((time-37.5)/11);
  lead.x=lerp(0,2.38,p);lead.z=lerp(-29,-39.55,p);lead.y=rampY(lead.z);
 }else if(time<49.2){
  lead.x=2.38;lead.z=lerp(-39.55,-40.02,(time-48.5)/.7);lead.y=rampY(lead.z);
 }else if(time<52){
  lead.x=2.38;lead.z=-40.02;lead.y=-2.62;lead.clip='Idle';lead.action='brace';lead.progress=smooth((time-49.2)/2.8);
 }else if(time<56.5){
  lead.x=2.38;lead.z=lerp(-40.02,-44,(time-52)/4.5);lead.y=-2.62;
 }else if(time<58.5){
  lead.x=2.55;lead.z=lerp(-44,-45.3,(time-56.5)/2);lead.y=-2.62;
  lead.clip='Death';lead.action='dive';lead.progress=smooth((time-56.5)/2);
 }else if(time<60){
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Death';lead.action='prone';
 }else if(time<64){
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Death';lead.action='get-up';lead.progress=smooth((time-60)/4);
 }else{
  lead.x=2.55;lead.y=-2.62;lead.z=-45.3;lead.clip='Idle';lead.action='none';
 }

 const friend1={x:-.82,y:0,z:15.2,yaw:0,clip:'Walk'};
 if(time<7)friend1.z=lerp(15.2,5.4,time/7);
 else if(time<24)friend1.z=lerp(5.4,-14.2,(time-7)/17);
 else if(time<29)friend1.z=lerp(-14.2,-20.2,(time-24)/5);
 else if(time<35.3){
  const p=smooth((time-29)/6.3);
  friend1.x=lerp(-.82,-2.75,p);friend1.z=lerp(-20.2,-26.3,p);
 }else{friend1.x=-2.75;friend1.z=-26.3;friend1.yaw=Math.PI/2;friend1.clip='Idle';}

 const friend2={x:.82,y:0,z:15.9,yaw:0,clip:'Walk'};
 if(time<7)friend2.z=lerp(15.9,6.2,time/7);
 else if(time<24)friend2.z=lerp(6.2,-13.2,(time-7)/17);
 else if(time<29)friend2.z=lerp(-13.2,-20.0,(time-24)/5);
 else if(time<36){
  const p=smooth((time-29)/7);
  friend2.x=lerp(.82,3.15,p);friend2.z=lerp(-20,-28.1,p);
 }else{friend2.x=3.15;friend2.z=-28.1;friend2.yaw=Math.PI/2;friend2.clip='Idle';}
 if(time>=52){friend1.clip='Idle';friend2.clip='Idle';}
 return [lead,friend1,friend2];
}

export function sampleMonochrome2(value){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 let shot='elevator';
 if(time>=7&&time<24)shot='street';
 else if(time>=24&&time<29)shot='storefront';
 else if(time>=29&&time<37.5)shot='store';
 else if(time>=37.5&&time<48.5)shot='ramp';
 else if(time>=48.5&&time<49.5)shot='crack';
 else if(time>=49.5&&time<52)shot='listen';
 else if(time>=52&&time<56.5)shot='noclip';
 else if(time>=56.5&&time<64)shot='backrooms';
 else if(time>=64)shot='title';
 const crack=time<37.5?0:time<49.2?1:time<49.8?1-smooth((time-49.2)/.6):0;
 const noclip=smooth((time-52)/2.1);
 const stand=smooth((time-60)/4);
 const title=smooth((time-64)/2);
 return {time,shot,crack,noclip,stand,title,ended:time>=MONOCHROME2_DURATION};
}
