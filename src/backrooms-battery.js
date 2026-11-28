/** Flashlight battery: a fixed charge that only drains while the beam is on. No recharging. */
export const BATTERY=Object.freeze({seconds:60,lowAt:.25,dyingAt:.1});
/** Drain `player.battery` (0–1) for `dt` seconds of beam. Returns true while any charge is left. */
export function drainBattery(player,beamOn,dt){
 if(!Number.isFinite(player.battery))player.battery=1;
 if(beamOn&&player.battery>0&&dt>0)player.battery=Math.max(0,player.battery-dt/BATTERY.seconds);
 return player.battery>0;
}
/** Beam strength 0–1: steady, then a nervous flicker as the charge runs out, then nothing. */
export function beamStrength(battery,time=0){
 if(!(battery>0))return 0;
 if(battery>=BATTERY.dyingAt)return battery<BATTERY.lowAt?.8+.2*Math.sin(time*9)**2:1;
 const k=battery/BATTERY.dyingAt,flick=Math.sin(time*37)*Math.sin(time*23.3+1.7);
 return Math.max(0,Math.min(1,.25+.55*k+(1-k)*.45*flick));
}
