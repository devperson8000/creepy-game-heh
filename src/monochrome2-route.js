/** Monochrome 2 routes. The public gameplay path stays sealed until release. */
export const MONOCHROME2_PLAY_PATH='/monochrome2/play';
export const MONOCHROME2_TEST_PATH='/testmonochrome2';
export function isMonochrome2PlayPath(pathname){return pathname==='/monochrome2/play'||pathname==='/monochrome2/play/';}
export function isMonochrome2TestPath(pathname){return pathname==='/testmonochrome2'||pathname==='/testmonochrome2/';}
export function isMonochrome2IntroPath(pathname){return pathname==='/monochrome2'||pathname==='/monochrome2/';}
