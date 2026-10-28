export const STATIC_START=94;
export const STATIC_FADE_START=95.2;
export const STATIC_END=96.1;
export const MUSIC_START=96.25;
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));

export function createBriefingTimeline({accents,musicDuration,dialogue=[]}){
 if(!Number.isFinite(musicDuration)||musicDuration<3||!Array.isArray(accents)||accents.length!==3||accents.some((at,i)=>!Number.isFinite(at)||at<1.5||at>=musicDuration||i>0&&at<=accents[i-1]))throw new Error('Three ordered musical accents must lie after the fade-in and inside the score.');
 const finish=MUSIC_START+musicDuration;
 return {duration:finish,sample(value){
  const time=Number.isFinite(value)?Math.max(0,value):0,scoreTime=clamp(time-MUSIC_START,0,musicDuration);
  const phase=time<STATIC_START?'briefing':time<STATIC_END?'static':time<MUSIC_START?'black':time<finish?'outro':'complete';
  const staticOpacity=phase==='static'?clamp((STATIC_END-time)/(STATIC_END-STATIC_FADE_START)):0;
  const musicGain=time<MUSIC_START?0:Math.min(clamp(scoreTime/1.5),clamp((musicDuration-scoreTime)/2));
  const wordCount=time<MUSIC_START?0:accents.filter(at=>scoreTime+1e-7>=at).length;
  const latest=wordCount?accents[wordCount-1]:null,impact=latest!==null?clamp(1-(scoreTime-latest)/.22):0;
  const clip=time<STATIC_END?dialogue.find(c=>time>=c.start&&time<c.start+c.duration):null;
  const shot=time<16?'welcome':time<34?'corridor':time<50?'friends':time<70?'quest':time<81?'sealed':'lights';
  return {time,phase,shot,scoreTime,staticOpacity,musicGain,wordCount,impact,subtitle:clip?.text??'',canProceed:time+1e-7>=Math.min(finish,MUSIC_START+accents[2]+2)};
 }};
}
