import {BACTERIA} from './monochrome2-tuning.js';
import {tierCount} from './monochrome2-tuning.js';
/** Progress raises the Bacteria a little, like Monochrome: every ladder section, the key and the doors. */
export function tierSpeedFor(kind,tier){
 const s=BACTERIA.speed[kind==='patrol'?'roam':kind]??BACTERIA.speed.roam,f=Math.max(0,Math.min(1,tier/tierCount));
 return s.base+(s.max-s.base)*f;
}
export function tierScale(tier,{hearing:h=.04,sight:g=.025}={}){const t=Math.max(0,Math.min(tierCount,tier));return {hearing:1+h*t,sight:1+g*t};}
