export const VOICE_NEAR_DISTANCE=2;
export const VOICE_MAX_DISTANCE=16;
const positioned=p=>p&&[p.x,p.y??0,p.z,p.yaw??0,p.pitch??0].every(Number.isFinite);

/** Head-relative coordinates keep each peer independent of the other game audio contexts. */
export function proximityVoiceMix(listener,source,active=true){
 if(!active||!positioned(listener)||!positioned(source))return {gain:0,x:0,y:0,z:-1};
 const dx=source.x-listener.x,dy=(source.y??0)-(listener.y??0),dz=source.z-listener.z;
 const distance=Math.hypot(dx,dy,dz),yaw=listener.yaw??0,pitch=listener.pitch??0;
 const x=Math.cos(yaw)*dx-Math.sin(yaw)*dz,z=Math.sin(yaw)*dx+Math.cos(yaw)*dz;
 const gain=distance<=VOICE_NEAR_DISTANCE?1:Math.pow(Math.max(0,(VOICE_MAX_DISTANCE-distance)/(VOICE_MAX_DISTANCE-VOICE_NEAR_DISTANCE)),5);
 return {gain,x,y:Math.cos(pitch)*dy+Math.sin(pitch)*z,z:Math.cos(pitch)*z-Math.sin(pitch)*dy};
}

/** Exactly one audible path per incoming microphone; distance is applied only once. */
export function createProximityVoice(context,media){
 const source=context.createMediaStreamSource(media),gain=context.createGain(),panner=context.createPanner();
 gain.gain.value=0;gain.channelCount=1;gain.channelCountMode='explicit';
 panner.panningModel='HRTF';panner.distanceModel='linear';panner.refDistance=1;panner.maxDistance=VOICE_MAX_DISTANCE;panner.rolloffFactor=0;
 panner.coneInnerAngle=360;panner.coneOuterAngle=360;
 source.connect(gain);gain.connect(panner);panner.connect(context.destination);
 let disposed=false,lastGain=0,lastPosition={x:NaN,y:NaN,z:NaN};
 return {update(listener,position,active=true){
  if(disposed)return;const mix=proximityVoiceMix(listener,position,active),now=context.currentTime;
  if(mix.gain!==lastGain){
   lastGain=mix.gain;
   if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(now);
   else{gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);}
   gain.gain.linearRampToValueAtTime(mix.gain,now+.06);
  }
  for(const axis of ['x','y','z'])if(!Number.isFinite(lastPosition[axis])||Math.abs(mix[axis]-lastPosition[axis])>.002){
   lastPosition[axis]=mix[axis];panner['position'+axis.toUpperCase()].setTargetAtTime(mix[axis],now,.045);
  }
 },dispose(){if(disposed)return;disposed=true;source.disconnect();gain.disconnect();panner.disconnect();}};
}
