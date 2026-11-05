/** Short, original wooden assembly/pickup sounds at their actual world positions. */
export function createBackroomsInteractionAudio(context,output){
 const active=new Set();let disposed=false;
 function play(kind,p){if(disposed||context.state!=='running')return;const at=context.currentTime,panner=context.createPanner(),gain=context.createGain(),source=context.createOscillator();panner.panningModel='HRTF';panner.refDistance=2;panner.rolloffFactor=1.4;panner.positionX.value=p.x;panner.positionY.value=p.y??.6;panner.positionZ.value=p.z;
 source.type='triangle';source.frequency.setValueAtTime(kind==='build'?190:360,at);source.frequency.exponentialRampToValueAtTime(kind==='build'?55:150,at+.1);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(kind==='build'?.18:.08,at+.007);gain.gain.exponentialRampToValueAtTime(.0001,at+.2);source.connect(gain);gain.connect(panner);panner.connect(output);active.add(source);source.onended=()=>{source.disconnect();gain.disconnect();panner.disconnect();active.delete(source);};source.start();source.stop(at+.22);
 }
 return {play,listener(p,yaw,pitch=0){if(disposed||!context.listener.positionX)return;const l=context.listener;l.positionX.value=p.x;l.positionY.value=p.y+(p.crouch?1.05:1.68);l.positionZ.value=p.z;l.forwardX.value=-Math.sin(yaw)*Math.cos(pitch);l.forwardY.value=Math.sin(pitch);l.forwardZ.value=-Math.cos(yaw)*Math.cos(pitch);l.upX.value=0;l.upY.value=1;l.upZ.value=0;},dispose(){disposed=true;for(const s of active)try{s.stop();}catch{}active.clear();}};
}
