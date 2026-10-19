# Halloween menu countdown

The Singleplayer/Multiplayer selection screen now includes a Halloween update countdown with a glowing pumpkin, embers, bats and a cobweb. It targets October 31, 2026 at 16:00 Australia/Sydney (AEDT / UTC+11), or 05:00 UTC. The absolute deadline is identical for all visitors. It clamps at zero and shows “Halloween has arrived. / The wait is over.” without automatically claiming a game update has deployed.

The card sits beside the mode selection on desktop and follows the buttons on smaller screens. Its animation respects both system and saved reduced-motion preferences. Its timer and visibility listener are disposed on menu changes or gameplay entry, and visibility restoration reads the current wall clock.

Validation: `npm test` passes 225 tests; `npm run build` passes with the existing Three.js size advisory. `GAME_TEST_URL=http://localhost:4173 npm run test:browser:halloween` checks a known Sydney deadline, a live second tick, layouts at 1440/1100/768/390/320px, button/card non-overlap, reduced-motion effects, multiplayer/back cleanup, exact expiry, completed-state persistence and solo entry. Desktop and mobile screenshots in ignored `work/` were visually inspected. No runtime page errors were reported.
