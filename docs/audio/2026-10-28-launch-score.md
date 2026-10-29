# Launch briefing audio — updated29October2026

The gated briefing owns one clock and separate Web Audio graph. Original game/arrival/monster recordings remain unchanged. The hooded stranger uses the existing synthetic bm_george voice.

## Uploaded score and three vroom swells

Source: John Carpenter - The Shape Hunts Allyson.mp4, supplied by the user. Lossless AAC extraction preserves all2499 packet hashes. Source SHA256: cae10d156b5b4d2530b73a2f80d2ecc7f51ba5fd53461e52e8d631f83b065fa2; extracted score.m4a: 2c0b7c89d70c5143774f997ff7352b12ac09421d4ef7c3885281d2f5abada073. Container58.060045s; decoded58.026666667s, confirmed by ffmpeg and Chromium. No re-encoding.

The user clarified that words belong on the three separated sustained bass/synth “vroom” swells, rather than adjacent drum attacks inside the first swell. STFT inspection shows three broad30–600Hz energy surges lasting about3s, separated by about10.667s. Onsets measured using1024-sample Hann /44-sample hop positive log spectral flux.

| Word | Original source time | New film time | Spectral flux |
| --- | ---: | ---: | ---: |
| HALLOWEEN | 10.691701 | 49.296284 | 32.488 |
| HAS | 21.358458 | 59.963041 | 29.993 |
| ARRIVED | 32.024218 | 70.628801 | 24.943 |

Playback seeks to source8.75s; music starts at film47.354583s and fades in over1.2s. First swell is about1.94s into playback. Each word appears instantly and stays. Entry action appears at72.628801s. Music continues under the title and fades over its last2s, ending at96.631250s, or fades when the player proceeds.

## Compact narration and reveal

The source clip manifest retains authoring coordinates; src/briefing-schedule.js derives actual playback times from decoded durations. Most pauses are0.6s, plus one1.2s clue-door glimpse and the purposeful final suspense beat. New “What's that?” uses bm_george, matching B2 mastering. Existing voices and the score are not sped up.

Monochrome warning begins40.455958s, extremely quietly. Question begins43.055958s. Monochrome stays planted until44.258583s, after the question ends, then charges. Panic begins0.12s after the charge; NOW and static begin exactly45.984583s. Full static holds0.7s, fades out by47.234583s, then a0.12s fully silent black gap precedes music.

A quiet8s looping tape/fluorescent bed removes dead air beneath the briefing. Earlier bounded0.8s original-monster snippets accompany the distant crossings; they are faint and do not alter the recording. The final cue rises from0.025 to0.16 gain only when the charge begins. URL-based audio decoding is shared among repeated snippets. Loop/seek offsets are preserved after mute/pause/unlock; all sources stop on dispose.

## Reproduction/verification

Generate voices, score metadata, static and tape bed using scripts/assets/generate-launch-briefing.py with the existing local Kokoro model. Runtime schedule is the shared authority for scene/audio/title/private preview times. Unit tests cover boundaries, cue separation, fade/seek offset, looped ambience, pause/mute/autoplay/disposal and file integrity; browser checks compare actual source-clock scheduling with DOM word appearances.
