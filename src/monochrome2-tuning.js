import {BACKROOMS_SPEED} from './backrooms-round.js';

/**
 * Every Monochrome 2 number lives here so tuning never means hunting through AI code.
 *
 * Speeds are Monochrome 1's monster speeds (patrol 1.8 / investigate 2.65 / chase 3.95 against a
 * 3.7 sprint) rescaled by Level 0's faster movement (sprint 9.2). Monochrome 1 numbers would be
 * about 2.5x too slow here: a walking player outruns 3.95 u/s without trying.
 */
const LEVEL0_SCALE=BACKROOMS_SPEED.sprint/3.7;
export const M1_SPEEDS=Object.freeze({patrol:1.8,investigate:2.65,chase:3.95});

export const MONSTER={
 /** Seconds after the round starts before he leaves his spawn room. */
 grace:15,
 // Chase starts a hair above sprint and climbs with progress (see `tierCount`).
 speed:Object.freeze({
  patrol:{base:+(M1_SPEEDS.patrol*LEVEL0_SCALE).toFixed(2),max:5.0},
  investigate:{base:+(M1_SPEEDS.investigate*LEVEL0_SCALE).toFixed(2),max:7.4},
  chase:{base:+(M1_SPEEDS.chase*LEVEL0_SCALE).toFixed(2),max:10.6}
 }),
 /** On the pitfall beams he is cautious; players wobble there, he does not fall. */
 beamSpeedFactor:.5,
 radius:.35,
 catchRadius:1.4,
 /** Sight: direct line only. Crouching shrinks how far a standing silhouette would carry. */
 sight:{range:22,crouchFactor:.5,closeAllRound:3,facingCos:.05},
 /** Seconds he keeps following a lost target before he starts searching. */
 chaseMemory:5,
 /** How long a search lasts, and how many probe points he checks. */
 search:{seconds:7,probes:3,probeRadius:6},
 /** After a catch he stands over the player, then searches that spot: reviving is a gamble. */
 catchStagger:2.2,
 postCatchSearch:8,
 /** Walls soften sound: every wall the sound crosses multiplies its reach. */
 hearing:{base:.92,wallFactor:.62,maxWalls:4,closedDoorFactor:.5,ttl:.4}
};
/** How many progress steps raise his stats: 4 ladder sections, key, door, exit door. */
export const tierCount=7;

export const NOISE={
 walk:12,sprint:30,crouch:2.5,
 wobble:{threshold:.55,radius:16,every:1.2},
 fall:{radius:32},
 interact:Object.freeze({part:8,ladder:22,key:6,door:24,'pit-exit-door':34,flashlight:8,rope:10,'alt-door':14,revive:10,vent:5,'alt-vent':5}),
 /** Existing microphone tiers (5/12/24/36 for M1's 2.6 m cells) rescaled for Level 0 rooms. */
 voiceScale:1.5,
 stride:{walk:1.1,sprint:1.25,crouch:.9}
};

export const TELEGRAPH={
 /** Audible well beyond sight range so you hear him before you can see him. */
 range:34,
 jawClickPeriod:{far:1.5,near:.2},
 whineHz:{idle:520,chase:980}
};

export const TEAM={
 maxRevives:2,
 reviveSeconds:3,
 reviveReach:2,
 /** Not in the original brief: a downed player bleeds out, otherwise a downed teammate can stall the exit forever. */
 bleedOutSeconds:75,
 reviveGrace:2.5
};

/** Hold-to-interact lengths (seconds). Longer holds mean longer exposure at every objective. */
export const HOLD={ladder:1.4,key:.9,door:1.5,'pit-exit-door':2.2,vent:1.2,'alt-vent':1.2,part:.7};

export function tierFromRound(r){
 if(!r)return 0;
 return Math.min(tierCount,(r.installed??0)+(r.hasKey?1:0)+(r.doorOpen?1:0)+(r.upperExitOpen?1:0));
}
export function tierSpeed(kind,tier){
 const s=MONSTER.speed[kind],f=Math.max(0,Math.min(1,tier/tierCount));
 return s.base+(s.max-s.base)*f;
}
export function tierScale(tier,{hearing=.04,sight=.025}={}){
 const t=Math.max(0,Math.min(tierCount,tier));return {hearing:1+hearing*t,sight:1+sight*t};
}
export function holdSeconds(targetId,fallback){return HOLD[targetId]??(targetId?.startsWith?.('part-')?HOLD.part:fallback);}
