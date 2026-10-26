# Halloween balance parity

Port the current normal game's shorter basement balance into Halloween. Public reference: `e777a7c1bc2a2498dbc0481ca535f59ce8262208`.

Maps now use 45/45/49/53 cells and 17/17/20/23 drawer rooms for one/two/three/four players, with three drawers per cabinet. Keys use the normal game's exact seeded selection of four different rooms across the latter 80% of the room search order. Code placement uses the first ceil(55%) of rooms ordered by shortest path from the entrance. The normal game's movement/stamina constants remain unchanged; Monochrome's maze chase now matches the 6.2 sprint speed. Sight, hearing through walls, pursuit and catch rules already matched and are verified against normal-game outputs.

`tests/fixtures/normal-game-balance.json` captures the public implementation's results for five seeds at every team size: map topology hashes, key drawer IDs, code, clue room and monster spawn. Seasonal solo and co-op must match those outputs exactly. Additional captured AI cases verify sight, close/hidden catches, noise and wall muffling. A straight chase verifies that sprinting holds the gap while walking loses ground.

Halloween layout markers, mechanical head, decorations, optional scavenger hunt, B2, proximity voice, teaser and house ending remain in the feature branch. Older single-row cabinet and legacy-map options remain available to their existing callers. Public main is unchanged.

Verification: all 366 project tests pass, Vite production build succeeds (existing chunk-size notice), and the password-protected new-gameplay browser flow passes cabinet interaction, recessed grilles, stairs, stamina and hunt release on the 45-cell/17-room/51-drawer map. Browser expectations for duo and four-player recovery were updated to the approved smaller maps.

The real co-op browser flow also passes: an authorized Halloween host and ordinary guest receive identical 45-cell/17-room/51-drawer maps, the same four distinct key rooms and nearer code; the real E-triggered house escape, shared finale cast/clock, hidden-host victory and session cleanup complete successfully.
