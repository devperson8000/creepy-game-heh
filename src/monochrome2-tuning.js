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
  investigate:{base:+(M1_SPEEDS.investigate*LEVEL0_SCALE).toFixed(2),max:7.0},
  chase:{base:+(M1_SPEEDS.chase*LEVEL0_SCALE).toFixed(2),max:10.3}
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
 search:{seconds:6,probes:3,probeRadius:6},
 /** After a catch he stands over the player, then searches that spot: reviving is a gamble. */
 catchStagger:2.2,
 postCatchSearch:8,
 /** Walls soften sound: every wall the sound crosses multiplies its reach. */
 hearing:{base:.92,wallFactor:.62,maxWalls:4,closedDoorFactor:.5,ttl:.4}
};
/**
 * The Bacteria, Level 0's main monster, tuned to what Escape the Backrooms documents about it:
 * it appears about three minutes in, near the players, mimicking knocking to lure them off route;
 * it wanders aimlessly, notices you by sight or by sound (screeching as it does), then chases until
 * it has lost sight of you for a while; ducking round corners or into a dead end makes it give up
 * and reappear somewhere else. Only the three-minute timer and the behaviours are documented:
 * the numbers below are Monochrome 2 tuning, not wiki facts.
 */
export const BACTERIA={
 /** Seconds of play before it first appears (the documented three minutes). */
 spawnDelay:180,
 /** It starts this far from every player and out of their line of sight, as close as it can manage. */
 spawnMinDistance:20,relocateMinDistance:28,
 /** Knocks it makes on arrival (to lure players off route), and the gap between them. */
 arrivalKnocks:3,knockGap:1.1,knockLinger:2.2,
 /** While roaming it stops now and then to knock again. */
 roamKnockEvery:Object.freeze([18,30]),roamKnockSeconds:3.2,
 speed:Object.freeze({roam:{base:2.0,max:2.6},investigate:{base:3.4,max:4.4},chase:{base:7.4,max:8.2}}),
 beamSpeedFactor:.5,radius:.4,catchRadius:1.5,
 /** Shorter sight than Monochrome, keener ears: it is the sound that gives you away. */
 sight:{range:16,crouchFactor:.5,closeAllRound:3,facingCos:.05},hearingScale:1.2,
 /** The screech as it notices you: a head start for anyone who reacts at once. */
 noticeSeconds:1.3,
 /** During a chase only a nearby or urgent noise keeps it on you; distance and corners shake it. */
 trackRadius:12,chaseMemory:5,
 /** Reaching your last known position with nobody there makes it give up this many times faster. */
 deadEndGiveUp:3,
 search:{seconds:5,probes:2,probeRadius:5},
 /** After giving up it vanishes and returns somewhere else. */
 relocateDelay:Object.freeze([10,18]),
 catchStagger:1.6,postCatchSearch:5
};
/**
 * Monochrome is rare in Monochrome 2: he visits twice at most, for under a minute, with long
 * quiet gaps, and withdraws to his room afterwards. The Bacteria is the monster of the level.
 */
export const MONOCHROME_VISITS={first:Object.freeze([300,390]),length:Object.freeze([40,55]),gap:Object.freeze([240,330]),max:2};
/** How many progress steps raise his stats: 4 ladder sections, key, door, exit door. */
export const tierCount=7;

export const NOISE={
 walk:12,sprint:26,crouch:2.5,
 wobble:{threshold:.55,radius:16,every:1.2},
 fall:{radius:32},
 interact:Object.freeze({part:8,ladder:22,key:6,door:24,'pit-exit-door':34,flashlight:8,rope:10,'alt-door':14,revive:10,vent:5,'vent-button':8}),
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
 reviveGrace:3.5
};

/** Hold-to-interact lengths (seconds). Longer holds mean longer exposure at every objective. */
export const HOLD={ladder:1.4,key:.9,door:1.5,'pit-exit-door':2.2,vent:1.2,'vent-button':.5,part:.7};

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
