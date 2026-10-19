# Six o'clock hunt verification

Later changes are recorded in [the faster finale and 3 AM start verification](2026-10-19-faster-finale.md).

The finale and preceding polish were pushed to `main` in `6fcc043` before this gameplay change began.

## Behavior

- The digital HUD clock starts at 12:00 AM after the arrival sequence. One game minute lasts 0.5 real seconds; six hours take 180 active seconds.
- At 6:00 the HUD clock disappears permanently for that run. A large 6:00 / IT IS HUNTING warning flashes and fades over three seconds. Reduced motion removes the flashes.
- Before six, Monochrome is hidden and cannot move, hear gameplay events, trigger proximity blackouts or catch players. Opening the boards no longer activates him.
- At six, he starts approaching the basement entrance from a room on the far southern side. The chosen room remains reachable around real furniture in the original and expanded maps. Later updates do not teleport him back to his spawn.
- Solo pause and keypad menus stop time. Co-op uses the host's elapsed clock and continues through individual pause menus. The existing authenticated host-clock calibration compensates for snapshot delivery delay when presenting time and the warning to guests; guests do not simulate authoritative captures.
- Clock time follows real elapsed intervals independently of bounded movement/physics steps. Snapshot clock anchors belong to the simulation tick before rendering, so slow renders cannot attach old elapsed time to a newer send timestamp. The arrival does not consume the safe period. Victory, death and the finale stop clock advancement. A solo retry keeps the same run's clock and banked progress; a new run resets both.

No database migration or new dependency is required.

## Verification

- Node suite: 190 passed, 0 failed. Coverage includes half-second minute boundaries, the exact six threshold, inactive monsters beside exposed players, closed boards at release, arrival/terminal phases, snapshot replication, slow frames, delayed-clock presentation, retry policy and reachable spawns for 1–4 players.
- Production build: passed, with the existing Three.js chunk size advisory.
- Solo production browser: clock visibility/pacing, real hidden actor meshes, desktop and 390 px phone framing, paused time, six warning, permanent clock removal and actual monster movement passed. Clock-boundary checks advance the real run's clock near six rather than waiting three minutes on every test run. Screenshots used actual scene rendering; later timing checks disabled software GPU drawing while retaining the real loop and UI.
- Two authenticated browser clients over the database fallback: arrival freeze, replicated clock, safe exploration, co-op pause, warning/release and late-snapshot cleanup passed. Final sampled visible clocks showed 1:03 / 1:04, half a real second apart. Authoritative state samples during the warning were 180.000 / 179.900 seconds; presentation uses calibrated host time to account for transit. Chrome focus emulation kept both views visible, as on two devices, for UI comparisons. GPU drawing was disabled after scene startup for network assertions.

- Co-op movement regression: 184 local samples and 189 remote-avatar samples, with no reverse position snaps; the largest sampled remote step was 0.114 m. Hidden-host progression and torch replication also passed.
- Solo regression: arrival skip, pause/preferences, phone layout, real keypad rejection/acceptance, capture, retry and elevator escape passed without runtime errors.

Reproduce with `npm test`, `npm run build`, `npm run test:browser:hunt` and `npm run test:browser:coop-hunt`. Browser checks use `GAME_TEST_URL` (default http://localhost:5173) and optionally `BROWSER_EXECUTABLE`.
