import {BRIEFING_DIALOGUE,STATIC_START,segmentAt,sceneTimeAt,filmTimeAt,MONOCHROME_HINTS,WARNING_START,SPRINT_START,sampleMonochromeBeat} from './briefing-schedule.js';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
export function sampleBriefingDirection(seconds,{reducedMotion=false}={}){
 const elapsed=Number.isFinite(seconds)?Math.max(0,Math.min(STATIC_START,seconds)):0;
 const [begin,end,shot,,,still]=segmentAt(elapsed);
 const t=reducedMotion?still:sceneTimeAt(elapsed),speechTime=reducedMotion?filmTimeAt(still):elapsed,clip=BRIEFING_DIALOGUE.find(c=>speechTime>=c.start&&speechTime<c.start+c.duration),local=clip?speechTime-clip.start:0;
 const speaking=clip?ease(local/.16)*ease((clip.duration-local)/.2):0;
 const gesture=.18+speaking*(.28+.12*Math.sin(local*2.2))+.22*pulse(t,9,9.8,11,12)+.3*pulse(t,73,73.3,74.7,75.5);
 const startle=ease((speechTime-SPRINT_START)/.3),headYaw=shot==='presence'?.78*pulse(t,86,88,91.3,92.8)-startle*.25:shot==='cutaway'?-.25:.05*Math.sin(t*.45);
 let notice=0,noticeYaw=0;for(const hint of MONOCHROME_HINTS){const n=pulse(speechTime,hint.noticeAt,hint.noticeAt+.15,hint.noticeAt+.45,hint.noticeAt+1.05);if(n>notice){notice=n;noticeYaw=n*(hint.side??1)*.48;}}
 return {elapsed,shot,poseTime:t,monochrome:sampleMonochromeBeat(speechTime),notice,hostVisible:['welcome','aside','cutaway','management','presence'].includes(shot),speaking,gesture:gesture*(1-notice*.35),headYaw:headYaw+noticeYaw,headPitch:speaking*.02*Math.sin(local*3)-startle*.025,startle,
  transition:reducedMotion||elapsed>=STATIC_START?0:Math.max(begin===0?0:1-ease((elapsed-begin)/.07),end===STATIC_START?0:1-ease((end-elapsed)/.05))};
}
