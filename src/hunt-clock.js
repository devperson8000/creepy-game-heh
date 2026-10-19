// One game minute lasts half a real second: 3 AM to 6 AM takes 90 seconds.
export const CLOCK_START_HOUR=3;
export const HUNT_START_SECONDS=(6-CLOCK_START_HOUR)*30;
export const HUNT_WARNING_SECONDS=3;
export function huntActive(run){return (run.huntElapsed??0)>=HUNT_START_SECONDS;}
export function advanceHuntClock(run,delta){
 if(run.phase!=='playing'||!Number.isFinite(delta)||delta<=0)return;
 run.huntElapsed=(run.huntElapsed??0)+delta;
}
export function huntClockView(run){
 const elapsed=Math.max(0,run.huntElapsed??0),minutes=Math.min(360,CLOCK_START_HOUR*60+Math.floor(elapsed*2)),playing=run.phase==='playing';
 const hour=Math.floor(minutes/60);
 return {text:`${hour||12}:${String(minutes%60).padStart(2,'0')}`,visible:playing&&elapsed<HUNT_START_SECONDS,warning:playing&&elapsed>=HUNT_START_SECONDS&&elapsed<HUNT_START_SECONDS+HUNT_WARNING_SECONDS};
}
export function sampleHuntElapsed(run,{hostAt,hostNow,running}={}){
 const elapsed=run.huntElapsed??0;
 if(run.phase!=='playing'||!running||!Number.isFinite(hostAt)||!Number.isFinite(hostNow))return elapsed;
 return elapsed+Math.max(0,hostNow-hostAt);
}
