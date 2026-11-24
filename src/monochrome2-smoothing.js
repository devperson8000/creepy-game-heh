/**
 * Smooths a replicated actor. The host sends snapshots about 7 times a second; drawing each one as it
 * arrives makes a fast creature visibly jump. This keeps the last snapshot, carries it forward a short,
 * capped distance along its heading while the next one is in flight, and eases the drawn position
 * toward that. Large jumps (a reset, a respawn) snap so nothing slides across the map.
 */
const wrap=a=>{a%=Math.PI*2;return a>Math.PI?a-Math.PI*2:a<-Math.PI?a+Math.PI*2:a;};
export function createRemoteTrack({follow=18,maxLead=.14,maxLeadDistance=1,snapDistance=5}={}){
 let snap=null,age=0,key='',shown=null;
 return {
  /** Feed the latest replicated sample every frame; only a changed sample restarts the lead clock. */
  push(sample){
   if(!sample||!Number.isFinite(sample.x)||!Number.isFinite(sample.z))return;
   const yaw=Number.isFinite(sample.yaw)?sample.yaw:0,speed=Number.isFinite(sample.speed)?Math.max(0,sample.speed):0,next=`${sample.x}|${sample.z}|${yaw}`;
   if(next!==key){key=next;age=0;snap={x:sample.x,z:sample.z,yaw,speed};}
  },
  step(dt){
   if(!snap)return null;
   const frame=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));age+=frame;
   const lead=Math.min(maxLeadDistance,Math.min(maxLead,age)*snap.speed),goal={x:snap.x+Math.sin(snap.yaw)*lead,z:snap.z+Math.cos(snap.yaw)*lead,yaw:snap.yaw};
   if(!shown||Math.hypot(goal.x-shown.x,goal.z-shown.z)>snapDistance){shown={...goal};return {...shown};}
   const k=1-Math.exp(-follow*frame);
   shown.x+=(goal.x-shown.x)*k;shown.z+=(goal.z-shown.z)*k;shown.yaw=wrap(shown.yaw+wrap(goal.yaw-shown.yaw)*k);
   return {...shown};
  },
  reset(){snap=null;shown=null;key='';age=0;}
 };
}
