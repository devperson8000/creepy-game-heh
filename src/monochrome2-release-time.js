/**
 * Monochrome 2 gameplay opens on a timer. The time is not decided yet, so by default the gate stays
 * sealed. Set it without a code change: put an ISO timestamp in the MONOCHROME2_RELEASE_AT
 * environment variable (Vercel project settings, or the shell for `npm run dev`), e.g.
 * `2026-12-05T20:00:00+11:00`. Or set the constant below. The server clock is authoritative.
 */
export const MONOCHROME2_RELEASE_AT=null;
export const MONOCHROME2_RELEASE_VERSION='monochrome2-level0-1';
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
