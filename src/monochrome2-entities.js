import {BACKROOMS_BACTERIA_SLOT} from './backrooms-entity-slot.js';

/**
 * Entity slots for Monochrome 2's Level 0.
 *
 * `monochrome` is live. Until a better model is imported it wears the repository's own rebuilt
 * metal-head body (`fallback`). Set `modelUrl` to a GLB path and it is loaded in its place; a failed
 * load keeps the metal-head, so the round never runs against an invisible monster.
 *
 * `bacteria` stays reserved exactly as Level 0 defined it (lower layer, awaiting its model): nothing
 * is simulated for it and no stand-in is drawn.
 */
export const MONOCHROME_SLOT=Object.freeze({
 id:'monochrome',status:'active',modelUrl:null,fallback:'rebuilt-metal-head',
 /** Rendered height in metres. The rebuilt body is ~3.6 m tall, far above a 2.8 m ceiling. */
 height:2.5,nativeHeight:3.6,layer:'upper',
 spawn:Object.freeze({x:25,z:-37}),
 /** Landmarks he walks between; objective sites are added at runtime. */
 patrol:Object.freeze([{x:-7,z:13},{x:18,z:6},{x:37,z:-16},{x:-23,z:-13},{x:25,z:-37},{x:24,z:25}])
});
export const MONOCHROME2_ENTITIES=Object.freeze({monochrome:MONOCHROME_SLOT,bacteria:BACKROOMS_BACTERIA_SLOT});
export const entitySlot=id=>MONOCHROME2_ENTITIES[id]??null;
export const activeEntities=()=>Object.values(MONOCHROME2_ENTITIES).filter(e=>e.status==='active');
export const reservedEntities=()=>Object.values(MONOCHROME2_ENTITIES).filter(e=>e.status!=='active');
