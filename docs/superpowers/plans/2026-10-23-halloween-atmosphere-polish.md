# Halloween Atmosphere Implementation Plan

> **For agentic workers:** Execute inline using executing-plans and TDD. The user has already requested autonomous implementation and publishing. A final branch review checks the integrated result.

**Goal:** Share polished Halloween props between the introduction and maze, increase deliberate decoration density, and polish the update’s presentation and quest animations.
**Architecture:** One resource-owning Three.js prop factory; one pure seeded placement planner; the existing world/intro/test/menu integrations consume them. Preserve authoritative gameplay and release rules.
**Tech Stack:** Three.js, JavaScript, Vite, Node tests, Playwright.
**Spec:** `docs/superpowers/specs/2026-10-23-halloween-atmosphere-design.md`.

## Global Constraints
- Three usable drawers per cabinet; 1.8 m corridors, 2.65 m ceilings; clean stairs.
- Walk/sprint/chase 4.6/6.2/5.5 m/s; stamina 8/1.1/6 seconds.
- Original audio, B2/finale coordinates, two-second skip and October 31 2026 4 PM Sydney release remain.
- No external asset requests; maximum three decoration point lights regardless of player count.

## Review Focus
- Floor props clipping into drawer approaches: room-local bounds and actual E tests.
- Props covering corridor closets or stairs: seeded anchors exclude both.
- Hidden code behind taller cabinets: code height and actual reading test.
- Shared resources disposed while another set still uses them: factory ownership/disposal tests.
- More decoration hurting rendering or motion accessibility: shared geometry, fixed lights, browser draw statistics and reduced-motion checks.

### Task 1: Shared prop models and intro integration
Files: create `src/halloween-props.js`, test `tests/halloween-props.test.js`, modify `src/opening-set.js`.
Interface: `createHalloweenProps({aged=false}={})` returns model constructors `pumpkin`, `web`, `bunting`, `stringLights`, `bats`, `candleCluster`, `lantern`, `wreath`, `skeleton`, plus `update(time,{reducedMotion=false}={})` and idempotent `dispose()`.
- [x] Test missing factory, finite model bounds, shared geometry, supported styles, preserved flame scale/reduced motion, disposal ownership; observe RED.
- [x] Implement detailed carved pumpkins, wax/drips, metal lanterns, paper decorations and webs; replace matching intro implementations with this factory.
- [x] Run focused tests and capture actual opening shots; commit.

### Task 2: Seeded maze dressing and quest polish
Files: create `src/halloween-decoration-plan.js`, test `tests/halloween-decoration-plan.test.js`; modify `src/halloween-world.js`, `src/maze-world.js`, `src/world.js`, `tests/maze-world.test.js`.
Interfaces: `createHalloweenDecorationPlan(layout,seed)` returns room/wall anchors with world x/z, floor-relative y, yaw, kind, scale and room index where relevant. The world returns its `placements` for verification and `update(time,{player,visibility,reducedMotion}={})`.
- [x] Test room decoration density, deterministic wall anchors, exclusion of stairs/closets, bounded wall intrusion, fixed light count and readable code; observe RED.
- [x] Place matching props in room-local coordinates, add clear corridor wall dressing and instanced leaves, preserve all quest target IDs, and animate lid/chains/key with bounded warm lighting.
- [x] Mount room labels on frames and raise the code above the cabinet. Verify seeded navigation, real drawer/closet/quest/code interactions and visual captures; commit.

### Task 3: Anticipation, private preview and integrated verification
Files: modify `src/halloween-countdown.js`, its CSS, `src/halloween-test-page.js`, `src/halloween-test-scenarios.js`, `src/main.js`; add `scripts/check-halloween-polish-browser.mjs`.
- [x] Add failing browser expectations for opening preview, actual code reading, decorated rooms/corridors and mobile anticipation card.
- [x] Add faithful upcoming-feature copy and password-only opening preview using existing cinematic lifecycle; preserve skip and fullscreen controls.
- [ ] Run `npm test`, build, opening/quest/gameplay/release/browser regressions; review branch, fix findings, push main and verify live.
