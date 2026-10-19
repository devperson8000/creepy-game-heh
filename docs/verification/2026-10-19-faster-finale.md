# Faster finale, visible dive and 3 AM start

This updates the earlier finale and hunt-clock verification records.

## Changes

- Finale duration: 52 → 27 seconds. Corridor and stair running play at twice their previous speed. The trapped-head interval, including the initial ascent, lasts approximately 3.4 seconds instead of 12.3 seconds.
- One shared beat table retimes poses, cameras and audio. The host's completion time, preview progress and replay all use the same 27-second duration.
- The dive uses the existing CC0 Jump clip with a forward body rotation around the pelvis, an airborne arc and a landing before the button close-up. The earlier camera clipped the runner's head during the leap. A new camera angle and wider portrait lens keep the head, hands and feet visible; running footsteps stop while airborne.
- Clock starts at 3:00 AM and reaches 6:00 after 90 active seconds at the existing half-second-per-minute rate. It disappears at six, with the same warning and far-side monster release.
- Gameplay chase speed: 4.15 → 3.95 units/second, still above the player's 3.7 sprint. Pursuit memory: 7 → 6.5 seconds. Patrol speed, investigation speed, sight/hearing ranges and capture distance retain their previous values.

## Verification

- Full Node suite: **196 passed, 0 failed**. New tests cover retimed state completion, shared audio/pose timing, real-rig dive pivot and desktop/portrait framing, silent airborne footsteps, the 90-second release and slightly gentler pursuit. Existing state, movement, objectives and rendering tests pass.
- Production build: passed; the existing Three.js chunk-size advisory remains.
- Rendered desktop and phone shots were inspected for launch, flight, landing and button contact. The dive is visibly airborne, with bent knees and extended arms.
- A full real 27-second production preview reached both winning-title lines. Replay, 2/3/4 survivor casts, mute, phone layout, Escape, repeated menu returns and model-download failure/retry passed without browser errors.
- Two authenticated co-op clients reached the shortened shared finale, hid gameplay HUD, passed mute controls, continued with a hidden host, caught up after a large seek and showed the authoritative win. Sample finale clocks: 2.012 / 2.175 seconds.
- Solo clock browser check passed: 3 AM start/pacing, hidden inactive monster, phone framing, pause, warning, clock removal and actual release/movement.
- Two-client clock browser check passed: arrival freeze, host replication, pause, shared warning/release and late-snapshot cleanup. Visible sample times: 4:02 / 4:03. Snapshot elapsed samples: 90.819 / 89.653 seconds; calibrated presentation compensates for delivery delay.

Preview/shot checks render the scene. Network timing checks disable GPU drawing after normal startup and retain real state, actors, controls and authenticated database transport. Clock boundary checks advance the run near six rather than waiting 90 seconds each time. These checks do not certify identical timing on every network or a universal frame rate.

Run `npm test`, `npm run build`, `npm run test:browser:finale`, `npm run test:browser:coop-finale`, `npm run test:browser:hunt` and `npm run test:browser:coop-hunt`. Set `GAME_TEST_URL` to the running production preview or development server.
