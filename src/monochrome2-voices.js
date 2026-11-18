const VOICE_PROFILES=[
 ['lead',[/daniel|oliver|arthur|fred|aaron|tom|george|david|james|google.*male|microsoft.*mark/i]],
 ['friend1',[/karen|moira|samantha|tessa|fiona|victoria|serena|ava|zoe|susan|aria|jenny|sonia|natasha|libby|hazel|michelle|olivia|rachel|zira|google.*female|microsoft.*(female|zira|aria|jenny|sonia)/i]],
 ['friend2',[/eddy|lee|rishi|matthew|liam|ryan|google.*male|microsoft.*guy/i]]
];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function selectMonochrome2Voices(availableVoices=[]){
 const english=availableVoices.filter(voice=>/^en[-_]/i.test(voice?.lang??''));
 const used=new Set(),selected=new Map();
 const score=(voice,speaker,patterns)=>{
  const name=String(voice.name??'').toLowerCase(),lang=String(voice.lang??'').toLowerCase();
  let value=/en[-_]au/.test(lang)?34:/en[-_]gb/.test(lang)?27:/en[-_]us/.test(lang)?22:10;
  if(/natural|neural|premium|enhanced|studio|online/i.test(name))value+=42;
  if(voice.localService===false)value+=5;
  if(/compact|robot|novelty|whisper/i.test(name))value-=24;
  if(patterns.some(pattern=>pattern.test(name)))value+=speaker==='friend1'?68:31;
  if(used.has(voice.name))value-=50;
  return value;
 };
 for(const [speaker,patterns] of VOICE_PROFILES){
  const voice=english.slice().sort((a,b)=>score(b,speaker,patterns)-score(a,speaker,patterns))[0];
  if(voice){used.add(voice.name);selected.set(speaker,voice);}
 }
 return selected;
}

export function monochrome2SpeechSettings(cue={}){
 const riley=cue.voice==='friend1';
 const baseRate=Number.isFinite(cue.rate)?cue.rate:.97;
 const basePitch=Number.isFinite(cue.pitch)?cue.pitch:1;
 return {
  rate:clamp(baseRate*(riley?1.035:1),.92,1.08),
  pitch:clamp(basePitch*(riley?1.07:1),.96,1.12)
 };
}
