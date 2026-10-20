# Monochrome II teaser verification

The B2 monitor now renders an original 25-second 3D film with the actual hazmat survivor and Monochrome actors. The survivor leaves an elevator, hears a plea behind an observation door, discovers Monochrome repeating the identical recording, retreats and runs as the door opens and lights go out, then drops the torch. The film cuts to **MONOCHROME II / DON'T TRUST THE VOICES**. The stranger says “Now you know what to listen for,” the monitor dies, and the stranger disappears. The existing stranger placeholder and its source-asset disclosure remain unchanged.

B2's shared host-controlled conversation is now 43 seconds. Gameplay resumes after the entire film and outro. The earned replay and password-authorized teaser test use the same film, with a one-second end-title hold and no stranger outro. The October 31 16:00 Australia/Sydney release gate and normal endings are unchanged.

Verified locally:

- `npm test`: **251 passing**, including full encounter completion, deterministic edit, voice-mimic mouth behavior and unlocking suspended audio at the current film time.
- `npm run build`: passes; existing bundle-size advisory remains.
- `npm run test:browser:teaser`: real-time 25-second film; repeated speech scheduled from the exact same audio buffer 5.5 seconds apart; actual jumpscare mouth; full stranger outro/disappearance; full replay including end hold; mute; reduced motion; 390px/320px layouts; model-load failure; replay/back/iframe cleanup; no browser exceptions.
- `npm run test:browser:halloween-quest`: real hold-E scavenger hunt, freeze hunt during B2, earn footage and return upstairs with progress preserved.
- `npm run test:browser:coop-halloween`: authenticated host/guest seasonal layout, shared B2 entry, guest walking, synchronized encounter completion and guest return control.
- Desktop story shots and actual monitor playback reviewed; corrected survivor facing, sliding-door continuity and torch attachment. Desktop and phone replay screenshots reviewed.
- Reproduced and fixed a final-hold regression: replay's elapsed-time extrapolation could cross into the stranger outro. Replay now uses its exact local clock.
- Audio dialogue is scheduled ahead on the audio clock so a slow rendered frame cannot skip a line. A suspended browser audio context rebases to current film time when unlocked. Hiding, exiting and disposing stop playback and release resources.

Original synthesized voice provenance is in `public/audio/halloween/CREDITS.md`. No stock footage or additional external model download was used.
