/** Four-timestamp exchange over authenticated actions and owner snapshots. */
export function createHostClock({now=()=>Date.now()/1000}={}){
 const pending=new Set();let offset=0,best=Infinity,ready=false;
 return {reset(){pending.clear();offset=0;best=Infinity;ready=false;},ping(){const stamp=now();pending.add(stamp);if(pending.size>4)pending.delete(pending.values().next().value);return String(stamp);},accept(echo){
  const received=now();if(!echo||!pending.has(echo.clientSent)||!Number.isFinite(echo.hostReceived)||!Number.isFinite(echo.hostSent))return false;
  pending.delete(echo.clientSent);const rtt=(received-echo.clientSent)-(echo.hostSent-echo.hostReceived);if(rtt<-.001||rtt>5||echo.hostSent<echo.hostReceived)return false;
  if(rtt<=best+.025){offset=((echo.hostReceived-echo.clientSent)+(echo.hostSent-received))/2;best=Math.min(best,rtt);ready=true;}return true;
 },sample:()=>now()+offset,get ready(){return ready;}};
}

// Calibration does not compete with normal interaction RPCs once initialized.
export const needsHostClockSync=(ready,phase)=>!ready||phase==='finale';
