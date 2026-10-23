const target=(param,value,time)=>{if(param?.setTargetAtTime)param.setTargetAtTime(value,time,.09);else if(param)param.value=value;};
/** Proximity gain lives upstream; this bus supplies direction and gently muffled walls only. */
export function createMonsterSpatialBus(context,destination){
 const filter=context.createBiquadFilter(),gain=context.createGain(),panner=context.createPanner?.()??context.createStereoPanner?.();filter.type='lowpass';filter.frequency.value=20000;filter.Q.value=.5;gain.gain.value=1;filter.connect(gain);gain.connect(panner??destination);panner?.connect(destination);
 if(panner?.positionX||panner?.setPosition){panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=1;panner.maxDistance=1000000;panner.rolloffFactor=0;panner.coneInnerAngle=360;panner.coneOuterAngle=360;}
 let disposed=false;
 function update({listener,source,occluded=false}={}){if(disposed||!listener||!source)return;const now=context.currentTime,yaw=listener.yaw??0,pitch=listener.pitch??0,forward=[-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)],up=[Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)],l=context.listener;
  if(l?.positionX){for(const [k,v]of Object.entries({positionX:listener.x,positionY:listener.y??0,positionZ:listener.z,forwardX:forward[0],forwardY:forward[1],forwardZ:forward[2],upX:up[0],upY:up[1],upZ:up[2]}))target(l[k],v,now);}else{l?.setPosition?.(listener.x,listener.y??0,listener.z);l?.setOrientation?.(...forward,...up);}
  if(panner?.positionX){target(panner.positionX,source.x,now);target(panner.positionY,source.y??0,now);target(panner.positionZ,source.z,now);}else if(panner?.setPosition)panner.setPosition(source.x,source.y??0,source.z);else if(panner?.pan){const dx=source.x-listener.x,dz=source.z-listener.z,d=Math.hypot(dx,dz);target(panner.pan,d?(dx*Math.cos(yaw)-dz*Math.sin(yaw))/d:0,now);}
  target(filter.frequency,occluded?1250:20000,now);target(gain.gain,occluded ? .8 : 1,now);
 }
 return {input:filter,update,dispose(){if(disposed)return;disposed=true;filter.disconnect();gain.disconnect();panner?.disconnect();}};
}
