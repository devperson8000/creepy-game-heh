/** Shared edit. Co-op uses the host's encounter clock. Creature names stay off-screen. */
export const TEASER_START=10;
export const TEASER_DURATION=25;
export const TEASER_END=TEASER_START+TEASER_DURATION;
export const B2_CONVERSATION_DURATION=43;
export const TEASER_VOICES=[{at:1.1,end:3.8,file:'radio-out',subtitle:'RADIO: “You made it out?”'}];
export const TEASER_GLIMPSES=[
 {id:'sonask',start:6.1,end:7.7},
 {id:'crawler',start:11.65,end:12.35},
 {id:'maw',start:16.35,end:18.05}
];
export const TEASER_SOUND_CUES=[{at:6.12,kind:'scrape'},{at:11.66,kind:'scuttle'},{at:16.4,kind:'breath'},{at:18.1,kind:'metal'}];
export function sampleTeaser(value){
 const time=Math.max(0,Math.min(TEASER_DURATION,Number.isFinite(value)?value:0));
 const shot=time<5?'arrival':time<10?'corner':time<15?'crossing':time<20?'doorway':time<21?'presence':'title';
 const cue=TEASER_GLIMPSES.find(g=>time>g.start&&time<g.end);
 const progress=cue?(time-cue.start)/(cue.end-cue.start):0;
 const glimpse=cue?{id:cue.id,progress,amount:Math.sin(progress*Math.PI)}:null;
 return {time,shot,glimpse,subtitle:TEASER_VOICES.find(v=>time>=v.at&&time<v.end)?.subtitle??'',blackout:time>=20.65&&time<21};
}
