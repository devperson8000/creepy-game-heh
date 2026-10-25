/** Shared choreography for the supplied animated Needlelimbs source. */
export const NEEDLELIMBS_DURATION=25;
export const NEEDLELIMBS_VOICES=[
 {at:1.1,end:2.4,file:'radio-out-v2',subtitle:'RADIO: “You made it out?”'},
 {at:4.1,end:7.8,file:'survivor-reply-v2',subtitle:'SURVIVOR: “Yes, but I don’t think it was just Monochrome…”'}
];
export const NEEDLELIMBS_MONSTER_CUE={at:12.5,end:20.65,file:'monster'};
export const NEEDLELIMBS_SOUND_CUES=[{at:7.7,kind:'scrape'},{at:12.1,kind:'metal'},{at:16.6,kind:'metal'},{at:18.9,kind:'breath'}];
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
// A short approach settles before the head moves, then reverses into cover.
function approach(t){return smooth(4,6.7,t)*(1-smooth(8.65,10.5,t));}
export function sampleNeedlelimbsTeaser(value){
 const time=Math.max(0,Math.min(25,Number.isFinite(value)?value:0)),step=approach(time),peek=smooth(6.5,7.35,time)*(1-smooth(7.9,8.65,time));
 const pursuit=smooth(12,17,time),distance=pursuit*3.1;
 return {time,shot:time<4?'arrival':time<12?'corner':time<21?'rebuilt':'title',subtitle:NEEDLELIMBS_VOICES.find(v=>time>=v.at&&time<v.end)?.subtitle??'',blackout:time>=20.65&&time<21,
  needle:{visible:time>=4&&time<20.65,position:[6.15-step*1.9,0,-6.05],yaw:-Math.PI/2,travel:step*1.9,walk:time<4?0:(1-smooth(6.1,6.7,time))*(1-smooth(8.65,10.5,time))+smooth(8.65,9,time)*(1-smooth(10,10.5,time)),peek},
  monochrome:{visible:time>=12&&time<20.65,position:[7.5-distance,0,-6.2],yaw:-Math.PI/2+.3*smooth(17,19,time),travel:distance,walk:smooth(12,12.5,time)*(1-smooth(16,17,time)),closeup:smooth(16.5,18,time),jaw:smooth(17.7,19.4,time)}
 };
}
