# Level 0 Needlelimbs audio
`needle-lure.mp3`: original phrase “Hello. Over here.” generated offline using FFmpeg Flite's synthetic `slt` voice; filtered, normalized and given a short room reflection. No real person's voice was cloned. Flite: https://github.com/festvox/flite (BSD-style license). A gameplay interpretation of Entity 38's voice mimicry; not an official recording.
Creature breathing reuses `/audio/halloween/sfx/needle-breath.mp3` and `needle-breath-heavy.mp3`, credited under the Mixkit Sound Effects Free License in `../halloween/CREDITS.md`. The original files are unchanged. New quiet echolocation clicks and short scrape accents are synthesized by Web Audio. Volume, pause and mute apply to all creature sound. No external audio service is used at runtime.

## Two-monster playable round
Downloaded and inspected directly on 5 November 2026, without account/sign-in:
- `https://assets.mixkit.co/active_storage/sfx/2234/2234.wav` — Terrifying Creature Breath, 609,136 bytes; source SHA-256 `69f78ac2760d5cd990fac4da2206989d92b9532eb59b941ecb14ac64f88f7392`. Converted to `stalker-breath.mp3`.
- `https://assets.mixkit.co/active_storage/sfx/2240/2240.wav` — Creepy demon heavy breathing, 1,364,618 bytes; source SHA-256 `cd6acf1dc873dc3716062221ac373bd60f96dc3f876a61235ddc503975de01c3`. Converted to `stalker-growl.mp3` (a lower-playback-rate hunting breath/growl layer, not a separate claimed original recording).
Source catalogue: https://mixkit.co/free-sound-effects/monster/ . License: https://mixkit.co/license/#sfxFree . Derivatives use high-pass/low-pass filtering, bounded loudness, mono24kHz MP3, and runtime spatial attenuation/occlusion. Original Needlelimbs recordings are retained. No copyrighted film soundtrack was scraped.
