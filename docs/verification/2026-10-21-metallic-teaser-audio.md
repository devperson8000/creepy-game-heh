# Metallic Monochrome teaser sound

The user's original Monochrome recording remains the source. Only the teaser's monster cue receives a strong steel-resonance and metallic-rasp effect. Gameplay and dialogue retain their existing sound. Both the active teaser and the prepared mechanical-head edit use the same treatment.

The direct layer remains at 86%, with a much more prominent filtered layer containing uneven metal reflections and fast modulation of that layer. The direct recording retains its pitch, speed and attack. No replacement monster recording is used and there is no persistent feedback loop. The 73 Hz modulation carrier controls only the processed layer’s gain and is never connected directly to the audio output. It stops when paused or disposed. Every metallic audio network is released when its source ends, on pause/seeking, or on disposal; mute remains downstream of both layers. The existing cue timings and volume controls are preserved.

`public/audio/monster.mp3` was checked against its SHA-256 recorded before this edit and is byte-for-byte unchanged. The separate [listening preview](https://creepy-game-heh.vercel.app/audio/halloween/monster-metallic-preview.mp3) was rendered through the production Web Audio effect, using the original recording at the teaser cue gain, and encoded as MP3. Runtime playback still loads the original file.

Validation:

- `npm test`: 262 tests pass.
- `npm run build`: passes; the existing bundle-size warning remains.
- `node scripts/check-metallic-teaser-browser.mjs`: passes in Chromium using real OfflineAudioContext rendering and real AudioContext playback scheduling. An impulse retains its direct attack, develops a short metallic tail, and returns to silence. Actual recording output is finite, peaks at 0.714, and measures 125.3% of the original cue's RMS level. Integration checks confirm only the monster receives a convolver, all source playback rates remain 1, and pause/replay/dispose release the resonance networks and stop their modulation carriers. No page exceptions.
- Existing suspended-audio regression passes: unlocking audio still joins the current film instead of replaying the opening.
- `git diff --check`: passes.

The separate Needlelimbs model dependency and activation status are unchanged.

The stronger revision leaves the direct mix at the same 86% as the first effect. The impulse response tail energy increases from 0.0192 to 0.1254, while the processed recording’s difference from the dry cue increases from 0.1655 to 0.7644 in relative RMS. Browser checks enforce a prominent metal layer while retaining the direct attack, useful loudness, clean headroom and a tail that returns to silence.
