import {STATIC_START,STATIC_FADE_START,STATIC_END,MUSIC_START,MUSIC_FADE,segmentAt} from './briefing-schedule.js';
export {STATIC_START,STATIC_FADE_START,STATIC_END,MUSIC_START} from './briefing-schedule.js';
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));

export function createBriefingTimeline({accents,musicDuration,musicOffset=0,dialogue=[]}){
 if(!Number.isFinite(musicOffset)||musicOffset<0||!Number.isFinite(musicDuration)||musicDuration<3||!Array.isArray(accents)||accents.length!==3||accents.some((at,i)=>!Number.isFinite(at)||at<Math.max(1.5,musicOffset+MUSIC_FADE)||at>=musicDuration||i>0&&at<=accents[i-1]))throw new Error('Three ordered musical accents must lie after the fade-in and inside the score.');
 const finish=MUSIC_START+musicDuration-musicOffset;
 return {duration:finish,sample(value){
  const time=Number.isFinite(value)?Math.max(0,value):0,scoreTime=musicOffset+clamp(time-MUSIC_START,0,musicDuration-musicOffset);
  const phase=time<STATIC_START?'briefing':time<STATIC_END?'static':time<MUSIC_START?'black':time<finish?'outro':'complete';
  const staticOpacity=phase==='static'?clamp((STATIC_END-time)/(STATIC_END-STATIC_FADE_START)):0;
  const musicGain=time<MUSIC_START?0:Math.min(clamp((time-MUSIC_START)/MUSIC_FADE),clamp((musicDuration-scoreTime)/2));
  const wordCount=time<MUSIC_START?0:accents.filter(at=>scoreTime+1e-7>=at).length;
  const latest=wordCount?accents[wordCount-1]:null,impact=latest!==null?clamp(1-(scoreTime-latest)/.22):0;
  const clip=time<STATIC_END?dialogue.find(c=>time>=c.start&&time<c.start+c.duration):null;
  const shot=segmentAt(time)[2];
  return {time,phase,shot,scoreTime,staticOpacity,musicGain,wordCount,impact,subtitle:clip?.text??'',canProceed:time+1e-7>=Math.min(finish,MUSIC_START+accents[2]-musicOffset+2)};
 }};
}
