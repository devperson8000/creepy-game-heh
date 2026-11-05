/** Creature sounds live at the actor, never on the camera. Existing audio context owns mute/pause. */
export function createNeedleAudio(context,output,{stalker=false}={}){
 const gain=context.createGain(),filter=context.createBiquadFilter(),panner=context.createPanner(),abort=new AbortController(),buffers=new Map(),nodes=new Set();
 gain.gain.value=.85;filter.type='lowpass';filter.frequency.value=4500;panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=2;panner.maxDistance=32;panner.rolloffFactor=1.7;filter.connect(gain);gain.connect(panner);panner.connect(output);
 let nextClick=4,nextBreath=7,nextLure=20,disposed=false,contacts=0,scares=0;
 for(const [key,url]of [['breath',stalker?'/audio/backrooms/stalker-breath.mp3':'/audio/halloween/sfx/needle-breath.mp3'],['heavy',stalker?'/audio/backrooms/stalker-growl.mp3':'/audio/halloween/sfx/needle-breath-heavy.mp3'],...(!stalker?[['lure','/audio/backrooms/needle-lure.mp3']]:[])])void fetch(url,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Creature audio unavailable');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(b=>{if(!disposed)buffers.set(key,b);}).catch(()=>{});
 function track(source,volume){nodes.add(source);source.onended=()=>{nodes.delete(source);source.disconnect();volume.disconnect();};source.connect(volume);volume.connect(filter);}
 function recorded(key,level){const buffer=buffers.get(key);if(!buffer||context.state!=='running')return;const s=context.createBufferSource(),v=context.createGain(),at=context.currentTime;s.buffer=buffer;if(stalker)s.playbackRate.value=.78;const duration=Math.min(buffer.duration,3.8);v.gain.setValueAtTime(0,at);v.gain.linearRampToValueAtTime(level,at+.15);v.gain.setValueAtTime(level,at+Math.max(.15,duration-.3));v.gain.linearRampToValueAtTime(0,at+duration);track(s,v);s.start();s.stop(at+duration);}
 function click(level=.075){if(context.state!=='running')return;const s=context.createOscillator(),v=context.createGain(),at=context.currentTime;s.type='sine';s.frequency.setValueAtTime(1700,at);s.frequency.exponentialRampToValueAtTime(430,at+.07);v.gain.setValueAtTime(.0001,at);v.gain.exponentialRampToValueAtTime(level,at+.008);v.gain.exponentialRampToValueAtTime(.0001,at+.15);track(s,v);s.start();s.stop(at+.16);}
 function impact(position){if(disposed||context.state!=='running')return;const s=context.createOscillator(),v=context.createGain(),p=context.createPanner(),at=context.currentTime;p.panningModel='HRTF';p.refDistance=2;p.rolloffFactor=1.5;p.positionX.value=position.x;p.positionY.value=.08;p.positionZ.value=position.z;s.type='triangle';s.frequency.setValueAtTime(420,at);s.frequency.exponentialRampToValueAtTime(75,at+.18);v.gain.setValueAtTime(.001,at);v.gain.linearRampToValueAtTime(.25,at+.005);v.gain.exponentialRampToValueAtTime(.001,at+.25);s.connect(v);v.connect(p);p.connect(output);nodes.add(s);s.onended=()=>{nodes.delete(s);s.disconnect();v.disconnect();p.disconnect();};s.start();s.stop(at+.28);}
 function update(state,player,yaw,time,{occluded=false,footContacts=0}={}){
  if(disposed)return;const at=context.currentTime,distance=Math.hypot(state.position.x-player.x,state.position.z-player.z);
  panner.positionX.setTargetAtTime(state.position.x,at,.04);panner.positionY.setTargetAtTime(1.7,at,.04);panner.positionZ.setTargetAtTime(state.position.z,at,.04);
  const l=context.listener;if(l.positionX){l.positionX.value=player.x;l.positionY.value=(player.y??0)+1.68;l.positionZ.value=player.z;l.forwardX.value=-Math.sin(yaw);l.forwardY.value=0;l.forwardZ.value=-Math.cos(yaw);l.upX.value=0;l.upY.value=1;l.upZ.value=0;}
  filter.frequency.setTargetAtTime(occluded?750:4800,at,.15);gain.gain.setTargetAtTime(!state.active||distance>30?0:occluded?.38:.85,at,.12);
  if(!state.active)return;
  if((state.scareCount??0)<scares)scares=0;
  if((state.scareCount??0)>scares){scares=state.scareCount;recorded('heavy',1);if(!stalker)click(.18);nextBreath=time+5;}
  if(time>=nextClick){nextClick=time+(state.mode==='investigate'?3.5:7.5);if(distance<25&&!stalker)click();}
  if(time>=nextBreath){nextBreath=time+(stalker&&state.mode==='investigate'?4:11)+(Math.sin(time)*.5+.5)*5;if(distance<17)recorded(state.mode==='investigate'?'heavy':'breath',.6);}
  if(time>=nextLure){nextLure=time+34;if(state.mode==='patrol'&&distance>5&&distance<26)recorded('lure',.65);}
  if(footContacts!==contacts){contacts=footContacts;if(distance<6)click(.008);}
 }
 function dispose(){if(disposed)return;disposed=true;abort.abort();for(const n of nodes){try{n.stop();}catch{}}nodes.clear();gain.disconnect();filter.disconnect();panner.disconnect();buffers.clear();}
 return {update,impact,dispose};
}
