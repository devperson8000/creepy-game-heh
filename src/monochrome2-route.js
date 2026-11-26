/** Monochrome 2 routes. `/monochrome2` stays the cinematic; `/monochrome2/play` is Level 0 gameplay. */
export const MONOCHROME2_PLAY_PATH='/monochrome2/play';
export function isMonochrome2PlayPath(pathname){return pathname==='/monochrome2/play'||pathname==='/monochrome2/play/';}
export function isMonochrome2IntroPath(pathname){return pathname==='/monochrome2'||pathname==='/monochrome2/';}
