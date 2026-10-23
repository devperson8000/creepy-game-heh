# Halloween Maze Implementation Plan

> **For agentic workers:** Execute inline with test-first changes, then review the completed branch.

**Goal:** Ship the approved Halloween maze, stamina chases, physical corridor closets and private test route.
**Architecture:** Preserve legacy runs; route Halloween layouts through a dedicated maze builder. Share motion logic across solo and co-op, and use the existing seasonal release and password services.
**Tech Stack:** Three.js, JavaScript, Vite, Node test runner, Playwright.
**Spec:** `docs/plans/2026-10-23-halloween-maze-design.md`

## Global Constraints

- Public rollout remains October 31, 2026, 16:00 Australia/Sydney.
- Retain the upstairs lobby/B2/finale coordinates and original monster recording.
- New corridors 1.8 m wide / ceiling 2.65 m; stairs 1.65 m wide / 22.4 m long.
- Walk/sprint/chase 4.6/6.2/5.5 m/s; sprint/recovery delay/refill 8/1.1/6 seconds.

## Review Focus

- Seed-dependent disconnected rooms, keys clustered near spawn, or unusable closets: seeded connectivity and clearance tests.
- Collision and pathfinding costs in a larger map: cell graph routes and rendered performance checks.
- Co-op corrections caused by stamina mismatch: identical command replay and reconciliation tests.
- Hidden camera/grille moving together: real world geometry and browser camera-turn captures.
- Public access to test shortcuts or early gameplay: private route authorization and release checks.

### Task 1: Seeded maze and geometry
- [x] Write and run failing size, reachability, one-drawer-per-room and depth tests.
- [x] Implement `createMazeLayout(seed,{playerCount})`, maze ground height and dedicated `createMazeWorld(run)` with cell navigation, drawer rooms, recessed closets and decoration adaptation.
- [x] Verify geometry, key spread, all interaction approaches and monster traversal across seeds.

### Task 2: Shared chase and stamina behavior
- [x] Write and run failing stamina duration/recovery, speed hierarchy and replay convergence tests.
- [x] Implement shared movement; integrate solo, host, predicted and replayed movement, HUD, scaled creature, close/rare original audio.
- [x] Verify pause/exhaustion/hiding behavior and co-op reconciliation.

### Task 3: Private test route and end-to-end checks
- [x] Write and run failing home-screen/private-route and authenticated new-gameplay browser checks.
- [x] Move hub access to `/testhalloween`, add authorized new-gameplay scenario and inspection/hunt controls.
- [x] Finish browser regressions and verify the production build before publication.

## Review and verification

- Removed hanging signs from both stair layouts and moved seasonal invitation/pumpkin/lantern props beyond the new descent. Reviewed actual browser captures from above and below the new stairs.
- Private previews now keep pointer lock disabled inside the input controller, so clicking the game does not prevent using the test toolbar.
- Review found the avatar correction limiter still capped sprinting at the old speed. A failing sustained 6.2 m/s avatar test reproduced the increasing lag; the limiter now follows authoritative speed and animation cadence matches faster movement. Cinematic sampling is unchanged.
- `npm test`: 283 passed. Includes seeded layouts and furnished traversal, stamina exhaustion/recovery, delayed command replay, legacy layouts and older-host compatibility.
- `npm run build`: passed; existing bundle-size advisory remains.
- `node scripts/check-new-gameplay-browser.mjs`: passed actual E-held drawer/closet interactions, fixed grille during camera rotation, safe exit, stamina use, hunt release and clean descent captures.
- `node scripts/check-halloween-test-coop-browser.mjs`: passed real authenticated host/guest maze selection and database input/snapshot transport. Observed zero backward corrections for local or remote motion; largest sampled remote step 0.0874 m.
- `GAME_TEST_URL=http://localhost:4173 node scripts/check-halloween-test-page-browser.mjs`: passed responsive password hub, every quest item collected with E, real key reveal/replay, B2 encounter/return, room cycling, full-game startup, teaser and menu teardown.
- Fullscreen browser regression passed native entry/Escape, iframe Escape, replay, cleanup and mobile fallback.
- Production-bundle menu regression passed removed home entry, disabled old test URLs, private-route cancellation, phone layout and ordinary solo/multiplayer navigation.
- Release browser regression passed spoofed future device time/preview query rejection and exact server-deadline activation of the 55-cell maze.
- Original `public/audio/monster.mp3` SHA-256 unchanged.
