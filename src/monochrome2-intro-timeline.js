export const MONOCHROME2_DURATION=48;

export const MONOCHROME2_DIALOGUE=[
 {id:'check-in',at:0.9,end:3.35,speaker:'LEAD',voice:'lead',text:'We made it out. Everyone okay?',rate:.94,pitch:.94},
 {id:'elevator',at:3.55,end:6.9,speaker:'RILEY',voice:'friend1',text:'Yeah. I never want to see that elevator again.',rate:.96,pitch:1.04},
 {id:'food',at:7.8,end:10.5,speaker:'JAMIE',voice:'friend2',text:'Can we find food before we start walking again?',rate:.95,pitch:1.08},
 {id:'shop',at:15.55,end:17.45,speaker:'RILEY',voice:'friend1',text:'There is a shop. No way.',rate:.97,pitch:1.04},
 {id:'supplies',at:17.8,end:20.0,speaker:'LEAD',voice:'lead',text:'Let us get some supplies. Then we will work out where we are.',rate:.92,pitch:.94},
 {id:'water',at:20.3,end:22.35,speaker:'JAMIE',voice:'friend2',text:'I am grabbing water. You two want anything?',rate:.96,pitch:1.08},
 {id:'sweet',at:22.45,end:23.75,speaker:'RILEY',voice:'friend1',text:'Something sweet, please.',rate:.98,pitch:1.04},
 {id:'catch-up',at:23.85,end:25.25,speaker:'LEAD',voice:'lead',text:'I will catch up.',rate:.93,pitch:.94},
 {id:'light',at:28.25,end:30.1,speaker:'LEAD',voice:'lead',text:'Wait... what was that?',rate:.88,pitch:.9},
 {id:'wall',at:32.0,end:34.65,speaker:'LEAD',voice:'lead',text:'I can hear something. There is something behind this wall.',rate:.88,pitch:.9},
 {id:'lost',at:37.15,end:39.1,speaker:'JAMIE',voice:'friend2',text:'Hey? Where did you go?',rate:.9,pitch:1.08}
];

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
export function sampleMonochrome2(value){
 const time=clamp(Number.isFinite(value)?value:0,0,MONOCHROME2_DURATION);
 let shot='elevator';
 if(time>=4&&time<14)shot='street';
 else if(time>=14&&time<17)shot='storefront';
 else if(time>=17&&time<24)shot='store';
 else if(time>=24&&time<28)shot='ramp';
 else if(time>=28&&time<32)shot='crack';
 else if(time>=32&&time<35)shot='listen';
 else if(time>=35&&time<39)shot='noclip';
 else if(time>=39&&time<45)shot='backrooms';
 else if(time>=45)shot='title';
 const crack=time<28?0:time<28.6?.78:time<29.35?.78*(1-smooth((time-28.6)/.75)):0;
 const noclip=smooth((time-35)/3.7);
 const stand=smooth((time-39.5)/4.4);
 const title=smooth((time-45)/2.2);
 return {time,shot,crack,noclip,stand,title,ended:time>=MONOCHROME2_DURATION};
}
