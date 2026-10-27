// Only bounded loudness leaves this detector. No recording or speech recognition.
export function createMicrophoneDetector(){
 const since=Array(5).fill(null);let last=null;
 function reset(){since.fill(null);last=null;return {level:0,meter:0};}
 return {reset,sample(samples,now,{enabled=true,sensitivity=1}={}){
  if(!enabled||!Number.isFinite(now)||!samples?.length)return reset();
  if(last!==null&&(now<last||now-last>350))reset();last=now;
  let mean=0,energy=0;
  for(const value of samples){if(!Number.isFinite(value))return reset();mean+=value;}
  mean/=samples.length;
  for(const value of samples)energy+=(value-mean)**2;
  const gain=Number.isFinite(sensitivity)?Math.max(.5,Math.min(2,sensitivity)):1;
  const rms=Math.sqrt(energy/samples.length)*gain;
  const next=rms>=.18?4:rms>=.09?3:rms>=.03?2:rms>=.012?1:0;
  let level=0;
  // Qualify thresholds separately: fluctuating loud speech still sustains its
  // lower tiers, while a brief scream peak cannot promote it to a scream.
  for(let tier=1;tier<=4;tier++){
   if(next<tier){since[tier]=null;continue;}
   since[tier]??=now;
   if(now-since[tier]>=160)level=tier;
  }
  return {level,meter:Math.min(1,rms/.24)};
 }};
}

export function voiceNoise(level,player){
 if(!Number.isInteger(level)||level<1||level>4||!player||player.status&&player.status!=='alive')return null;
 const at=player.hidden?player.closetExit:player;
 if(!at||!Number.isFinite(at.x)||!Number.isFinite(at.z))return null;
 const panic=level===4&&player.sprint&&player.moving;
 const radius=([0,5,12,24,panic?44:36][level])*(player.hidden?.35:1);
 return {x:at.x,z:at.z,height:at.height??player.height,radius,type:'voice',urgent:level===4,playerId:player.id};
}
