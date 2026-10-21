# Metallic Monochrome teaser sound

The user's original Monochrome recording remains the source. Only the teaser's monster cue receives a short steel-resonance effect. Gameplay and dialogue retain their existing sound. Both the active teaser and the prepared mechanical-head edit use the same treatment.

The direct layer remains at 86%, with a quieter filtered layer containing uneven, rapidly decaying metal reflections. There is no pitch shift, time stretching, replacement monster recording or persistent feedback loop. Every metallic audio network is released when its source ends, on pause/seeking, or on disposal; mute remains downstream of both layers. The existing cue timings and volume controls are preserved.

`public/audio/monster.mp3` was checked against its SHA-256 recorded before this edit and is byte-for-byte unchanged. The separate [listening preview](https://creepy-game-heh.vercel.app/audio/halloween/monster-metallic-preview.mp3) was rendered through the production Web Audio effect, using the original recording at the teaser cue gain, and encoded as MP3. Runtime playback still loads the original file.

Validation:

- `npm test`: 262 tests pass.
- `npm run build`: passes; the existing bundle-size warning remains.
- `node scripts/check-metallic-teaser-browser.mjs`: passes in Chromium using real OfflineAudioContext rendering and real AudioContext playback scheduling. An impulse retains its direct attack, develops a short metallic tail, and returns to silence. Actual recording output is finite, peaks at 0.332, and retains 88.9% of the original cue's RMS level. Integration checks confirm only the monster receives a convolver, all source playback rates remain 1, and pause/replay/dispose release the resonance networks. No page exceptions.
- Existing suspended-audio regression passes: unlocking audio still joins the current film instead of replaying the opening.
- `git diff --check`: passes.

The separate Needlelimbs model dependency and activation status are unchanged.
