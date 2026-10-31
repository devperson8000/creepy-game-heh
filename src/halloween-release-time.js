export const HALLOWEEN_DEADLINE=Date.parse('2026-10-31T20:30:00+11:00');
export const HALLOWEEN_VERSION='halloween-2026-2030';
export function releaseStatus(now=Date.now()){
 return {version:HALLOWEEN_VERSION,releaseAt:HALLOWEEN_DEADLINE,serverNow:now,released:now>=HALLOWEEN_DEADLINE};
}
