import {prependFinaleRecap} from './teaser-recap.js';
import {createTeaserScene} from './teaser-scene.js';
import {createTeaserAudio} from './teaser-audio.js';
import {sampleTeaser} from './teaser-timeline.js';
import {NEEDLELIMBS_READY} from './teaser-edition.js';
import {createNeedlelimbsTeaserScene} from './needlelimbs-scene.js';
import {sampleNeedlelimbsTeaser,NEEDLELIMBS_VOICES,NEEDLELIMBS_SOUND_CUES,NEEDLELIMBS_MONSTER_CUE} from './needlelimbs-timeline.js';

/** Keep picture, dialogue and cue timing together for the private work-in-progress edit. */
export function createTeaserPlayback({preview=false}={}){
 if(!preview)return prependFinaleRecap({scene:createTeaserScene(),audio:createTeaserAudio(),sample:sampleTeaser});
 return prependFinaleRecap({scene:createNeedlelimbsTeaserScene({allowMissingNeedlelimbs:!NEEDLELIMBS_READY}),audio:createTeaserAudio({voices:NEEDLELIMBS_VOICES,soundCues:NEEDLELIMBS_SOUND_CUES,monsterCue:NEEDLELIMBS_MONSTER_CUE}),sample:sampleNeedlelimbsTeaser});
}
