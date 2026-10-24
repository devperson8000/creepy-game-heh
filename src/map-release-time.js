export const MAP_RELEASE_DEADLINE=Date.parse('2026-10-24T21:35:00+11:00');
export const MAP_RELEASE_VERSION='new-map-2026-10-24';
export function mapReleaseStatus(now=Date.now()){return {version:MAP_RELEASE_VERSION,releaseAt:MAP_RELEASE_DEADLINE,serverNow:now,released:now>=MAP_RELEASE_DEADLINE};}
