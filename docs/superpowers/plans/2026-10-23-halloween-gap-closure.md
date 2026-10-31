# Halloween Gap Closure Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. User requests implementation now; existing autonomous authorization applies. One fresh whole-branch review follows integration.

**Goal:** Close the existing Halloween audit plus map-wall glitches, retaining a clearly scoped Needlelimbs placeholder and truthful physical-device limits.
**Architecture:** Joined exposed wall geometry, an imported independently owned skinned keeper, deferred archive media, positional audio and authenticated recovery around existing host authority. No second gameplay/transport engine.
**Tech Stack:** JavaScript, Three.js, Web Audio, Blender, Supabase RPC/Realtime, Node tests, Playwright.
**Spec:** docs/superpowers/specs/2026-10-23-halloween-gap-closure.md

## Global Constraints
- Release 31 October 2026 16:00 Australia/Sydney; password-only /testhalloween; no public test controls.
- Preserve three drawers/cabinet, maze/stair/grille clearance, movement/stamina/hunt tuning and original MP3s.
- B2 optional and house escape requirements unchanged. Needlelimbs pending.
- Actual model source/credit/licence preserved; async disposal and audio preferences apply.

## Review Focus
- Joined wall faces, closet apertures, enemy sight and collision must agree at edges and rotated recesses.
- Leaving while model/archive/audio loads must neither leak nor restart a disposed scene.
- Imported keeper must use its actual rig for readable gestures and physical switch contact.
- Reconnect/host change must preserve progress and reject obsolete authority, including mid-cutscene.
- Real four-client/emulated touch checks cannot establish physical-phone performance.

### Task 1: Joined maze walls
Files: new src/maze-wall-surfaces.js; src/maze-world.js; tests/maze-wall-surfaces.test.js; browser wall sweep script.
Interface: mazeWallHalf(layout,x,z), buildMazeWallSurfaces(layout) returns bounded chunk BufferGeometries and face metadata; meshes tagged mazeWall.
- [x] Reproduce visible same-plane overlap on seed42; failing actual-scene overlap/ray/aperture tests.
- [x] Implement union boundary geometry with closet casing and shared widths; verify seeded routes/rays, browser moving viewpoints, commit.

### Task 2: Imported black hooded keeper
Files: public/models/b2/, docs/assets/b2-keeper/, conversion script; src/hooded-stranger.js or new source-backed keeper module; B2 integration/tests.
Interface: loadKeeperAsset(), createHoodedStranger({asset}) retains root/sample/dispose/fingerTip; fallback supports same interface.
- [x] Download verified free rigged source, inspect rig/materials and licence; failing real-asset/gesture bounds tests.
- [x] Convert/adapt black faceless clothing, rigged head/hand animation and owned disposal; review actual B2 poses/phone, credit and commit.

### Task 3: Deferred B2/performance and continuity
Files: src/halloween-experience.js, teaser loading, cinematic lifecycle, arrival; tests plus browser request/cancellation checks.
Interface: existing experience facade; deferred playback created at archive approach, clock authority retained. Arrival opts into Halloween continuity cue.
- [x] Failing no-early-GLB/cancel/late-load tests and suit cue checks.
- [x] Defer archive media, ensure error/cancel fallback and warm-up, add suited wake-up cue/update stale copy; verify cold/warm flow and commit.

### Task 4: Spatial monster sound
Files: src/monster-audio.js; new spatial helper; game/coop callers; audio/raycast tests.
Interface: audio.update(distance,active,delta,{listener,source,occluded}) retains legacy three-argument compatibility; bounded world obstruction callback/sample.
- [x] Failing left/right/front/behind, muffling and centred scare/mute tests.
- [x] Wire listener orientation, panner/filter smoothing and bounded geometry queries; verify original recordings/headroom, commit.

### Task 5: Authenticated recovery
Files: src/lobby-client.js, src/coop-game.js, snapshot restore helper/simulation, SQL migration only if account available; tests.
Interface: recover same client identity and request current authoritative snapshot; owner transitions are server-backed and restore existing state.
- [x] Inspect account/schema/docs; failing transient recovery/authority/state restore tests.
- [x] Implement bounded reconnect/fresh snapshot and server succession where available; verify actual network interruption and old authority rejection, commit.

### Task 6: Integrated QA, audit and publication
- [x] Full suite/build; sequential wall/keeper/B2/ending/intro/release lifecycle browsers; four actual client transport and emulated touch controls; record measured requests/draw calls and remaining physical QA limits.
- [x] Fresh whole-branch review, one evidence-backed fix pass, audit table statuses and documentation.
- [x] Commit, fast-forward/push main, verify Vercel commit/alias and live private/public flows; concise result with exact remaining limits.
