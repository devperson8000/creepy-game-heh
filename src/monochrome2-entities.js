import {BACKROOMS_MODEL_DIR} from './backrooms-models.js';

/**
 * Entity slots for Monochrome 2's Level 0.
 *
 * `bacteria` is the monster of the level (see monochrome2-bacteria.js): it wears the rigged
 * bacteria.glb. If that file cannot load it stays offline rather than becoming an invisible killer.
 * `monochrome` is rare: he visits twice at most (see MONOCHROME_VISITS), wearing the repository's
 * rebuilt metal-head body unless `modelUrl` is set. Plain Level 0 (/backrooms) keeps its own empty
 * Bacteria slot in backrooms-entity-slot.js and is not affected.
 */
export const MONOCHROME_SLOT=Object.freeze({
 id:'monochrome',status:'active',modelUrl:null,fallback:'rebuilt-metal-head',
 /** Rendered height in metres. The rebuilt body is ~3.6 m tall, far above a 2.8 m ceiling. */
 height:2.5,nativeHeight:3.6,layer:'upper',
 spawn:Object.freeze({x:25,z:-37}),
 /** Landmarks he walks between; objective sites are added at runtime. */
 patrol:Object.freeze([{x:-7,z:13},{x:18,z:6},{x:37,z:-16},{x:-23,z:-13},{x:25,z:-37},{x:24,z:25}])
});
export const BACTERIA_SLOT=Object.freeze({
 id:'bacteria',status:'active',modelUrl:BACKROOMS_MODEL_DIR+'bacteria.glb',
 /** The baked rig stands 2.45 m tall; it is a head taller than the 1.8 m players. */
 height:2.45,nativeHeight:2.45,layer:'upper',
 spawn:Object.freeze({x:-23,z:-13}),
 /** Landmarks it wanders between and appears at; the nearest suitable one to the players is chosen. */
 patrol:Object.freeze([{x:-7,z:13},{x:18,z:6},{x:37,z:-16},{x:-23,z:-13},{x:25,z:-37},{x:24,z:25},{x:3,z:-22},{x:-15,z:24},{x:10,z:-8},{x:-4,z:-30}])
});
export const MONOCHROME2_ENTITIES=Object.freeze({bacteria:BACTERIA_SLOT,monochrome:MONOCHROME_SLOT});
export const entitySlot=id=>MONOCHROME2_ENTITIES[id]??null;
export const activeEntities=()=>Object.values(MONOCHROME2_ENTITIES).filter(e=>e.status==='active');
export const reservedEntities=()=>Object.values(MONOCHROME2_ENTITIES).filter(e=>e.status!=='active');
