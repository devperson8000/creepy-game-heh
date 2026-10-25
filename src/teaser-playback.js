import {prependFinaleRecap} from './teaser-recap.js';
import {createTeaserAudio} from './teaser-audio.js';
import {NEEDLELIMBS_READY} from './teaser-edition.js';
import {createNeedlelimbsTeaserScene} from './needlelimbs-scene.js';
import {sampleNeedlelimbsTeaser,NEEDLELIMBS_VOICES,NEEDLELIMBS_SOUND_CUES,NEEDLELIMBS_MONSTER_CUE} from './needlelimbs-timeline.js';

/** B2, replay and tests share the supplied Needlelimbs edit. */
export function createTeaserPlayback(){
 return prependFinaleRecap({scene:createNeedlelimbsTeaserScene({allowMissingNeedlelimbs:!NEEDLELIMBS_READY}),audio:createTeaserAudio({voices:NEEDLELIMBS_VOICES,soundCues:NEEDLELIMBS_SOUND_CUES,monsterCue:NEEDLELIMBS_MONSTER_CUE}),sample:sampleNeedlelimbsTeaser});
}
