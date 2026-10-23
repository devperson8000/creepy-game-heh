import {createTeaserAudio} from './teaser-audio.js';
import {b2DialogueLines} from './b2-dialogue.js';
import {TEASER_END} from './teaser-timeline.js';
/** Use the existing audio-clock scheduler, with no monster track or synthetic steps. */
export function createB2Voice(){return createTeaserAudio({voices:b2DialogueLines(TEASER_END),monsterCue:null,soundCues:[],footsteps:false});}
