# Needlelimbs teaser preparation — verification

## Scope and activation

The replay button is removed from the mode menu. The Monochrome I pre-menu intro slot is wired but has no authored film yet, so the mode menu opens immediately. The replacement Monochrome II film, dialogue and mechanical Monochrome design are staged behind `NEEDLELIMBS_READY=false`.

The exact selected Needlelimbs source could not be downloaded: the official Sketchfab endpoint requires authentication (HTTP 401). The actual rig, walk clips, orientation, ground contact and final corner occlusion have **not** been visually verified. No different model or procedural substitute is presented as the selected model. The public film remains the previous working edit until the original file is available and reviewed.

## Checks

- `npm test`: 262 passing tests. New checks cover the revised dialogue/shot overlap; continuous approach and stopping path; Monochrome's approach and mechanical close-up; distinct jaw, plates, hinges and repaired neck; skeletal animation on a synthetic fixture; source isolation; root-drift removal; deterministic seeking; rejection of static or unidentified animations; and intro clock, hidden pause, reduced motion and single completion.
- `npm run build`: passes. The existing Vite warning about chunks over 500 kB remains; no build error.
- `node scripts/check-needlelimbs-preparation-browser.mjs`: passes in Chromium. Captured front, side and body screenshots of the actual authored mechanical head; rendered the staged rebuilt shot with the Needlelimbs dependency explicitly unavailable; verified no substitute actor; checked skip during delayed intro loading, exactly one menu handoff and exactly one film disposal; decoded the real reply MP3 and checked audio offsets, mute, future-sound cancellation and teardown; checked the removed replay button with an existing recovered-footage storage flag; verified the menu at desktop, 390 px and 320 px. No page exceptions.
- `npm run test:browser:teaser`: passes for the active public edition. Full real-time 25-second film, shared encounter deadline, legacy creature glimpses, stranger outro and disappearance, replay, mute, reduced motion, mobile layouts, asset failure feedback and repeated teardown remain working.
- `git diff --check`: passes.

The first delayed-intro disposal check caught a double-disposal race. `disposeFilm()` now clears its reference when releasing the film; the same browser check passed after the fix.

## Review artifacts and remaining work

- [Mechanical Monochrome previews](../assets/mechanical-monochrome/README.md)
- [Scene design, source blocker and integration steps](../plans/2026-10-21-needlelimbs-teaser.md)

Required input: a signed-in download of Loco's Needlelimbs model with its animation data and textures. It must be inspected and tested in the complete new solo replay and shared B2 encounter before activation. The tests above do not claim that the unavailable source animation has been verified.
