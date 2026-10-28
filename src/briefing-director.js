import dialogue from '../public/audio/launch/dialogue.json' with {type:'json'};
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
const segments=[[0,16,'welcome'],[16,28,'corridor'],[28,34,'aside'],[34,43,'friends'],[43,47,'aside'],[47,50,'friends'],[50,60,'clues'],[60,70,'notes'],[70,73,'sealed-door'],[73,81,'cutaway'],[81,85.5,'management'],[85.5,94,'presence']];
const still={welcome:6,corridor:22,aside:29,friends:38,clues:55,notes:64,'sealed-door':71,cutaway:75,management:83,presence:90};
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
export function sampleBriefingDirection(seconds,{reducedMotion=false}={}){
 const elapsed=Number.isFinite(seconds)?Math.max(0,Math.min(94,seconds)):0;
 const [begin,end,shot]=segments.find(([a,b])=>elapsed>=a&&elapsed<b)??segments.at(-1);
 const t=reducedMotion?still[shot]:elapsed,clip=dialogue.clips.find(c=>t>=c.start&&t<c.start+c.duration),local=clip?t-clip.start:0;
 const speaking=clip?ease(local/.16)*ease((clip.duration-local)/.2):0;
 const gesture=.18+speaking*(.28+.12*Math.sin(local*2.2))+.22*pulse(t,9,9.8,11,12)+.3*pulse(t,73,73.3,74.7,75.5);
 const startle=ease((t-92.35)/.8),headYaw=shot==='presence'?.78*pulse(t,86,88,91.3,92.8)-startle*.25:shot==='cutaway'?-.25:.05*Math.sin(t*.45);
 return {elapsed,shot,poseTime:t,hostVisible:['welcome','aside','cutaway','management','presence'].includes(shot),speaking,gesture,headYaw,headPitch:speaking*.02*Math.sin(local*3)-startle*.025,startle,
  transition:reducedMotion||elapsed>=94?0:Math.max(begin===0?0:1-ease((elapsed-begin)/.22),end===94?0:1-ease((end-elapsed)/.16))};
}
