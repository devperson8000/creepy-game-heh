# Remove player-facing test options

Removed Creature study, Two-tab co-op test and Test finale animation from the title menu, plus the study link from the gameplay intro. Removed their unused callback and menu styling. Production builds ignore the former study/co-op-test/finale query modes and show the normal menu. Direct local-development URLs remain available for automated verification, without menu links. Normal co-op victory still uses the same cinematic player.

Verification:

- Release-menu browser regression first failed against the old build (five options instead of two), then passed against the updated production build.
- All former test URLs show Singleplayer/Multiplayer, including the paired guest query. Phone layout, Multiplayer/Back and Singleplayer/arrival/pause/return passed without runtime errors.
- All 203 Node tests passed; production build passed with the existing Three.js chunk-size advisory.
- Updated local finale scripts passed full 30-second playback, winning titles, replay, cast selection, mute, mobile layout, menu returns and model-load retry. Renderer-failure/retry passed separately.
- The preview runner now opens its development URL directly. Its wall-clock check starts before navigation, and readiness predicates use `window.monochromeFinale` so fresh navigation cannot raise an undeclared-global error. Both harness issues found during this transition were corrected before the passing run.
- Code review reported no findings; `git diff --check` passed.

Reproduce with `npm test`, `npm run build`, and `npm run test:browser:release-menu` against a production preview (default port 4173). Preview and other developer-helper checks require `npm run dev` (default port 5173).
