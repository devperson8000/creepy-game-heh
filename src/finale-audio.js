const MARKERS=[
 [2,'footsteps',165],[12,'stairs',180],[19,'impact',65],
 [21,'button',440],[23,'doors',85],[30,'ascent',100],[35,'metal',58],[44,'daylight',660]
];
const bound=value=>Math.min(1,Math.max(0,Number.isFinite(value)?value:0));
export function createFinaleAudio({volume=.8,muted=false}={}){
 let gain=bound(volume),quiet=!!muted,context=null,master=null,track=null,last=-1,disposed=false,primed=false;
 const seen=new Set();
 function ensure(){
  if(disposed)return false;
  if(!context){const Ctx=globalThis.AudioContext??globalThis.webkitAudioContext;if(Ctx){context=new Ctx();master=context.createGain();master.connect(context.destination);}}
  if(!track&&typeof globalThis.Audio==='function'){
   track=new Audio('/audio/monster.mp3');track.preload='auto';track.loop=true;
   track.addEventListener('error',()=>{track?.pause();});
  }
  setGain();return !!context;
 }
 function setGain(){if(master)master.gain.value=quiet?0:gain*.23;if(track){track.volume=quiet?0:gain*.38;track.muted=quiet;}}
 function effect(hz=120,duration=.2){
  if(!context||!master||quiet||gain<=0)return;
  const oscillator=context.createOscillator(),envelope=context.createGain(),at=context.currentTime;
  oscillator.type=hz>250?'triangle':'sawtooth';oscillator.frequency.setValueAtTime(hz,at);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(36,hz*.45),at+duration);
  envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(.18,at+.015);envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(envelope).connect(master);oscillator.start(at);oscillator.stop(at+duration+.015);
 }
 function resume(){if(disposed)return Promise.resolve();primed=true;ensure();return context?.resume().catch(()=>{})??Promise.resolve();}
 function sample(value){
  if(disposed)return;
  const t=Math.max(0,Math.min(52,Number.isFinite(value)?value:0));if(!primed)return;
  if(t>=2&&t<39){
   if(track?.paused){if(last<0||t-last<.75)void track.play().catch(()=>{});}
  }else if(track&&!track.paused)track.pause();
  if(last>=0&&t>=last&&t-last<.6){
   for(const [at,name,frequency] of MARKERS)if(last<at&&t>=at&&!seen.has(name)){seen.add(name);effect(frequency,name==='metal'?.55:.2);}
   // A low heartbeat pulse helps the chase without excessive loudness.
   const beat=Math.floor(t*1.75);if(t>=2&&t<23&&beat!==Math.floor(last*1.75))effect(65,.13);
  }
  last=t;
 }
 function reset(){last=-1;seen.clear();if(track){track.pause();try{track.currentTime=0;}catch{}}}
 function dispose(){if(disposed)return;disposed=true;reset();track?.removeAttribute('src');track?.load?.();track=null;if(context)void context.close().catch(()=>{});context=null;master=null;}
 return {resume,sample,reset,setVolume(value){gain=bound(value);setGain();},setMuted(value){quiet=!!value;setGain();},dispose,get muted(){return quiet;},get volume(){return gain;}};
}
