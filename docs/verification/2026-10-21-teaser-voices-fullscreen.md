# Teaser voices and test fullscreen

The updated private teaser uses two clearer offline-generated neural voices. The question is 0.984 seconds as MP3 (previously about 1.22), and the reply is 3.288 seconds (previously 5.04). Both retain the requested wording. Mild filtering and compression preserve intelligibility; the original monster recording and its metallic teaser effect are unchanged.

The subtitle windows match the quicker lines. The planned Needlelimbs head peek begins during the end of the approach, keeping its peek within the faster survivor reply. The overall film is still 25 seconds. The selected Needlelimbs source remains unavailable and the private preview still clearly labels the missing actor.

All Halloween test cases now have a **Fullscreen** button. Native fullscreen contains the player and its replay/back controls. Replay keeps fullscreen active; going back or leaving the hub exits it. Escape works both from the parent controls and from inside the game iframe without closing the film. Browsers without native fullscreen use an expanded player that fills the browser viewport. Small screens wrap the title above the controls.

Speech sources and generation details are credited in `public/audio/halloween/CREDITS.md`. Model weights and tooling stay in ignored workspace files; only the small rendered MP3s ship.

Checks:

- Full unit suite and production build.
- `node scripts/check-halloween-test-fullscreen-browser.mjs`: native entry, state label, height, Escape from controls and iframe, replay persistence, back cleanup, 390px expanded fallback and no horizontal overflow.
- `node scripts/check-halloween-updated-teaser-browser.mjs`: password entry, both versioned voice requests, updated subtitles, mechanical reveal, missing-model disclosure, complete film, replay and teardown.
- `node scripts/check-needlelimbs-preparation-browser.mjs`: actual new reply MP3 decoding, correct mid-line offset, mute, cancellation and disposal.
- Original `public/audio/monster.mp3` checksum remains unchanged.
