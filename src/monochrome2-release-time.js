/**
 * Monochrome 2 Level 0 opens Wednesday 2 December 2026 at 9:00 AM
 * Sydney time (AEDT, UTC+11). The API supplies the authoritative server clock.
 */
export const MONOCHROME2_RELEASE_AT=Date.parse('2026-12-02T09:00:00+11:00');
export const MONOCHROME2_RELEASE_VERSION='monochrome2-level0-2026-12-02-0900';
/** Parse a configured release time; anything that is not a real date means "not scheduled". */
export function parseReleaseAt(value){
 if(value===null||value===undefined||value==='')return null;
 const t=typeof value==='number'?value:Date.parse(String(value));
 return Number.isFinite(t)?t:null;
}
export function monochrome2ReleaseStatus(now=Date.now(),releaseAt=MONOCHROME2_RELEASE_AT){
 const at=parseReleaseAt(releaseAt);
 return {version:MONOCHROME2_RELEASE_VERSION,releaseAt:at,scheduled:at!==null,serverNow:now,released:at!==null&&now>=at};
}
