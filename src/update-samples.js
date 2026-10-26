export const UPDATE_SAMPLES=Object.freeze({room:'/audio/halloween/sfx/room-dread.mp3',wind:'/audio/halloween/sfx/vent-wind.mp3',static:'/audio/halloween/sfx/monitor-static.mp3'});
/** An optional sample bank owned by the calling scene's AudioContext. Never starts late after pause/disposal. */
export function createUpdateSamples(context,{files=UPDATE_SAMPLES,fetchAudio=fetch}={}){
 const buffers=new Map(),active=new Set(),abort=new AbortController(),master=context.createGain();master.gain.value=0;master.connect(context.destination);let disposed=false,lastVolume=0;
 const ready=Promise.allSettled(Object.entries(files).map(async([id,url])=>{const r=await fetchAudio(url,{signal:abort.signal});if(!r.ok)throw Error('Update sound unavailable');const b=await context.decodeAudioData(await r.arrayBuffer());if(!disposed)buffers.set(id,b);}));
 function volume(value){if(disposed)return;const next=Math.max(0,Math.min(1,value));if(next===lastVolume)return;lastVolume=next;if(next===0){master.gain.cancelScheduledValues?.(context.currentTime);master.gain.setValueAtTime(0,context.currentTime);}else master.gain.setTargetAtTime(next,context.currentTime,.12);}
 function play(id,{gain=.025,offset=0,duration=8,pan=0,fade=.35,wrapOffset=false}={}){
  const buffer=buffers.get(id);if(disposed||context.state!=='running'||!buffer)return false;
  const at=context.currentTime,span=Math.max(0,buffer.duration-Math.min(duration,buffer.duration));
  // Long sessions rotate through complete excerpts rather than replaying a clipped tail.
  const start=wrapOffset?(span>0?Math.max(0,offset)%span:0):Math.max(0,Math.min(offset,Math.max(0,buffer.duration-.1))),length=Math.min(duration,buffer.duration-start);if(length<=.02)return false;
  const source=context.createBufferSource(),level=context.createGain(),filter=context.createBiquadFilter(),panner=context.createStereoPanner?.();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=id==='wind'?1700:4500;
  source.connect(filter);filter.connect(level);if(panner){panner.pan.value=Math.max(-1,Math.min(1,pan));level.connect(panner);panner.connect(master);}else level.connect(master);
  const ramp=Math.min(fade,length/3);level.gain.setValueAtTime(0,at);level.gain.linearRampToValueAtTime(gain,at+ramp);level.gain.setValueAtTime(gain,at+length-ramp);level.gain.linearRampToValueAtTime(0,at+length);
  const record={id,source,level,filter,panner,pan};active.add(record);source.onended=()=>{active.delete(record);source.disconnect();level.disconnect();filter.disconnect();panner?.disconnect();};source.start(at,start);source.stop(at+length);return true;
 }
 function pan(id,value){if(disposed)return;const next=Math.max(-1,Math.min(1,value));for(const r of active)if(r.id===id&&r.panner&&Math.abs(next-r.pan)>.005){r.pan=next;r.panner.pan.setTargetAtTime(next,context.currentTime,.18);}}
 function stop(){for(const r of [...active]){try{r.source.stop();}catch{}r.source.disconnect();r.level.disconnect();r.filter.disconnect();r.panner?.disconnect();active.delete(r);}}
 function dispose(){if(disposed)return;disposed=true;abort.abort();stop();master.disconnect();buffers.clear();}
 return {ready,play,pan,volume,stop,dispose,get activeCount(){return active.size;}};
}
