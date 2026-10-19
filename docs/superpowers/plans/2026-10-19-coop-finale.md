# Monochrome Co-op Finale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver the approved multiplayer elevator finale and a main-menu button that previews the same animation without completing a round.

**Architecture:** A host-owned cinematic record freezes gameplay and drives a deterministic 52-second timeline on each viewer. A dedicated Three.js scene reuses the actual character assets; a local preview and multiplayer adapter share its scene, audio, and timing controller. Keep cinematic presentation separate from movement prediction and network transport.

**Tech Stack:** JavaScript ES modules, Three.js 0.180.0, Vite 7.1.9, existing Supabase/WebRTC snapshot transport, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-19-coop-finale-design.md` (approved by user).

## Global Constraints

- Target duration: 52 seconds. Use the game's actual hazmat characters and Monochrome model, rendered in real time.
- This sequence applies to multiplayer rounds that began with at least two players. Singleplayer keeps its existing ending.
- The host starts the finale once all four keys are banked and the correct code is accepted, whichever requirement is completed last. There is no additional elevator interaction required in this mode.
- Start it exactly once. Freeze gameplay movement, enemy attacks, downed timers, and interactions for the duration.
- Add a visible **Test finale animation** control to the main menu.
- Provide **Replay** and **Back to menu** controls, plus Escape to return. Include a 2/3/4-player cast selector in the preview controls.
- Display **YOU ESCAPED.** followed by **TOGETHER.**
- All audio respects saved mute and volume settings. Reduced-motion mode retains the story and duration while removing camera shake and abrupt motion effects.
- The existing polish is already on `main` at `36de932`; keep this feature separate until verified.

## Review Focus

1. Completing the objectives in either order, including the last key banked after a previously accepted code, starts exactly one finale (Task 1).
2. A hidden host, a returning viewer, and delayed snapshots must progress to the current shot without replaying impacts or hanging on black (Tasks 1, 4, 5).
3. A fallen or disconnected teammate must not reappear as a living hero; a single remaining cast member still performs the button press (Tasks 1, 2, 5).
4. Repeated preview/replay/back cycles and asset/audio failures must leave a usable menu and stop abandoned render/audio work (Tasks 2, 4).
5. Mobile framing, reduced motion, and muted playback must retain every essential story beat, including the hand press and visible elevator ascent (Tasks 3, 4, 5).

## File structure and boundaries

| File | Responsibility |
| --- | --- |
| `src/finale-state.js` | Cast selection, authoritative trigger/completion, ordered shot boundaries, viewer clock. No DOM or Three.js. |
| `src/finale-actors.js` | Survivor cinematic poses and the creature's mouth, constrained neck, severed head, and dying animation. |
| `src/finale-set.js` | Basement, stairs, elevator cab/doors, shaft, and daylight exit geometry; owned-resource cleanup. |
| `src/finale-scene.js` | Timeline sampling, cameras, actor staging, fade/title presentation through returned frame state. |
| `src/finale-audio.js` | Monster track and layered cinematic effects; event deduplication, mute, cleanup. |
| `src/finale-player.js`, `src/finale.css` | Common cinematic playback UI/controller and standalone preview lifecycle. |
| Existing co-op state/simulation/game | Host-owned start, shared snapshot timing, gameplay freeze, rendering handoff and final outcome. |
| Existing main/menu | Preview entry and return to menu. |
| Tests and browser script | Pure timing/state checks, actor/scene checks, full preview and two-client acceptance checks. |

### Task 1: Authoritative finale state and viewer clock

**Files:** Create `src/finale-state.js`, `tests/finale-state.test.js`; modify `src/coop-state.js`, `src/coop-simulation.js`, `tests/coop-simulation.test.js`.

**Interfaces:**
- `FINALE_DURATION = 52`; `finaleShot(seconds) -> {name,start,end}` with boundaries 0/2/12/19/23/30/35/39/44/52 from the spec.
- `beginFinale(state, nowSeconds) -> boolean` requires original round size >=2, four banked keys, accepted code, phase `playing`, at least one living player. Writes `run.phase='finale'` and `run.finale={id,startedAt,duration:52,elapsed:0,cast,runnerId,buttonId}`. Cast entries copy only id/name/slot; choose roles per spec, buttonId equals runnerId when alone.
- `advanceFinale(state, nowSeconds) -> boolean` derives elapsed from the host start clock, clamps to [0,52], freezes gameplay elapsed, and transitions once to `won` at 52. Rescued cast becomes escaped; fallen non-cast members retain their status.
- `createFinaleClock({now=()=>performance.now()/1000}={}) -> {sync(record),sample(),reset()}` uses monotonic local elapsed after receipt. Ignore backwards updates for the current ID, including after completion; a new ID resets. Correct drift <=.75 seconds gently; catch up immediately for greater drift. Clamp sample to [0,52].
- `createCoopSimulation(state, world, {ambushChance=.12, now=()=>Date.now()/1000}={})` preserves existing callers. Store original team size in co-op run state, carry cinematic record in existing snapshots, and call begin/advance before ordinary movement/AI. Successful interactions can trigger immediately after their result.

- [x] Write failing tests for either objective order, incomplete/solo objectives, repeat trigger, distant runner/tied slot ordering, dead/disconnected exclusion, downed rescue, single-cast button fallback, gameplay freeze, original round size after departures, JSON snapshot roundtrip, delayed/new/old clock updates, and exactly one win transition.
- [x] Run `node --test tests/finale-state.test.js tests/coop-simulation.test.js`; confirm new tests fail for missing behavior.
- [x] Implement the interfaces above without changing movement packets, peer authentication, or database schema. Reject interaction/input consumption during the finale; preserve existing one-player co-op behavior.
- [x] Run the focused tests and `npm test`; all pass, including existing movement and victory tests adjusted only where multiplayer ending semantics intentionally change.
- [x] Commit as `feat: coordinate the co-op finale timeline`.

### Task 2: Cinematic character performances

**Files:** Create `src/finale-actors.js`, `tests/finale-actors.test.js`, `docs/assets/finale/README.md`; modify `src/player-avatar.js`, `tests/player-avatar.test.js`.

**Interfaces:**
- Extend the avatar with `sampleCinematic({clip,time,position,yaw,action='none',progress=0,handTarget=null})`; evaluates an absolute clip time, exact world transform and additive dive/button/bracing poses. It suppresses name/speaking labels and torch-holding IK for cinematic use. Ordinary `update(pose,delta)` remains unchanged.
- `createFinaleSurvivor(asset, member) -> {root,sample(pose),dispose()}` wraps that API and exposes no shared mutable rig.
- `createFinaleCreature() -> {root,head,jaw,sample({time,mode,position,yaw,neckPosition,deathTime}),dispose()}` reuses `createCreature`; modes are `chase`, `trapped`, `severed`, `dead`. A hinged mouth visibly opens/snaps, the neck is constrained at the door plane, and a detached head settles independently of the body. After deathTime >=4, no twitch remains.

- [x] Write failing assertions for absolute-time sampling reproducibility, isolated clone transforms, source asset immutability, dive posture, button hand reaching its world target, labels hidden, head detachment, stable terminal death pose, and idempotent cleanup. Include a real hazmat GLB fixture using the existing test loader pattern.
- [x] Run `node --test tests/finale-actors.test.js tests/player-avatar.test.js`; confirm the new assertions fail.
- [x] Investigate a reusable web death clip, document source/license and actual rig compatibility in `docs/assets/finale/README.md`. Use a compatible clip if available; otherwise document why the procedural head/jaw requires authored motion. Implement the interfaces and character performances, including the one-survivor hand press.
- [x] Run the focused tests; confirm existing avatar movement, IK, lights, and material ownership checks still pass.
- [x] Commit as `feat: animate the finale survivors and creature`.

### Task 3: Cinematic set, staging, and cameras

**Files:** Create `src/finale-set.js`, `src/finale-scene.js`, `tests/finale-scene.test.js`.

**Interfaces:**
- `createFinaleSet({quality='auto'}={}) -> {root,cab,doors,button,shaftFrame,shaftLights,floorIndicator,blood,exit,sample(time),dispose()}`. The elevator cab is a moving parent; fixed shaft fixtures remain outside it. Geometry makes the stair approach, door plane, and daylight exit usable by the shot timeline.
- `createFinaleScene({asset,cast,runnerId,buttonId,reducedMotion=false,quality='auto'}) -> {scene,camera,sample(time),resize(aspect),dispose()}` owns set/actors and returns `{shot,fade,title,complete}` from sample. Sampling any time directly must produce the correct scene without playing preceding frames.
- Shot staging follows all time intervals in the spec. Title is two DOM-ready strings `YOU ESCAPED.` and `TOGETHER.`. Fade transitions use smooth easing; reduced motion disables shake while keeping the shot boundaries and 52-second duration.

- [x] Write failing tests that sample each shot midpoint and its boundary; assert finite camera/actor transforms, door closure before ascent, shaft frame outside moving cab, independent detached head and black blood after the cut, stable corpse, daylight exit, title timing, and deterministic results when seeking backward/forward. Compare shake-free reduced-motion camera samples.
- [x] Run `node --test tests/finale-scene.test.js`; confirm missing scene interfaces fail.
- [x] Implement the set and scene. Use actual meshes for the illuminated close button, moving door leaves, dark blood pool, mouth interior and visible shaft cross-frame. Frame the pressing hand, trapped head, elevator indicator and final team exit clearly. Apply mobile framing through resize; avoid postprocessing dependencies.
- [x] Run focused tests; manually inspect rendered frames from chase, stairs, press, trap, ascent, severing, corpse and daylight on wide and narrow viewports before accepting the scene.
- [x] Commit as `feat: stage the elevator finale and cinematic cameras`.

### Task 4: Shared playback, audio, and test button

**Files:** Create `src/finale-audio.js`, `src/finale-player.js`, `src/finale.css`, `tests/finale-audio.test.js`, `scripts/check-finale-browser.mjs`; modify `src/main.js`, `src/lobby-menu.js`, `package.json`, `README.md`.

**Interfaces:**
- `createFinaleAudio({volume=.8,muted=false}={}) -> {resume(),sample(time),setVolume(value),setMuted(value),dispose()}`. Use `/audio/monster.mp3` plus synthesized breath, steps, metal/door/ascent/impact layers. Deduplicate crossing events and suppress old one-shots on large seeks. Load failures leave the rest playing; silence follows death.
- `createFinalePlayer({container,renderer,asset,cast,runnerId,buttonId,preview=false,onExit=()=>{},onComplete=()=>{}}) -> {sample(time),resize(),dispose()}` owns the shared scene/audio/UI, but never disposes a borrowed renderer or cached asset. Preview owns its renderer/loop and exposes Replay, Back to menu, 2/3/4 cast choice and Escape; multiplayer caller supplies time.
- `startFinalePreview(container,{onExit}) -> Promise<controller>` preloads the avatar, starts two demonstrators by default and handles loading/error/retry UI. A direct `onTestFinale` menu callback starts it inside the user gesture; `?mode=finale` also opens the same preview with a Play control if browser audio needs a gesture. Returning recreates the menu.
- Add npm script `test:browser:finale` for `node scripts/check-finale-browser.mjs`.

- [x] Write failing audio tests for mute/volume, duplicate events, late seeks, track failure and repeated dispose. Add browser assertions for the visible menu button, preview initialization, full 52-second progression, both title lines, replay, cast changes, Escape/back, model-load failure with retry, and no runtime errors or growing canvas count after three preview visits.
- [x] Run the new tests/script against the current build; verify missing controls/interfaces fail.
- [x] Implement playback, cinematic styling and preview controls. Use saved preferences; prevent gameplay keys from leaking into preview; keep controls keyboard-accessible and visible on phones. Stop old audio and loops on replay, cast change, error or exit.
- [x] Run audio tests and the preview browser script on a fresh production build. Check narrow viewport overflow, muted playback and reduced-motion playback. Listen to the mix and inspect the full scene sequence; save review screenshots in ignored `work/`.
- [x] Commit as `feat: add finale sound and a replayable menu preview`.

### Task 5: Multiplayer presentation and end-to-end verification

**Files:** Modify `src/coop-game.js`, `src/finale-player.js`, `scripts/check-two-tab-browser.mjs`, `scripts/check-finale-browser.mjs`, `README.md`; extend `tests/finale-state.test.js` and `tests/coop-simulation.test.js` if integration exposes gaps.

**Interfaces:**
- The existing `startCoopGame` result gains read-only access to the active finale controller for browser inspection. The host calls the authoritative clock in Task 1; snapshots remain on the existing authenticated peer/database channels. Guests feed `run.finale` records into `createFinaleClock`.
- Entering `run.phase==='finale'` disposes arrival presentation, closes keypad/pause/scare UI, clears input, releases pointer lock, pauses gameplay audio and renders `createFinalePlayer` with the existing renderer. Keep network/proof snapshots and background host ticking alive.
- Gate normal victory/death overlays until the cinematic reaches its final frame; then dispose presentation and show the normal won screen. A viewer receiving a finished run with finale metadata renders the final shot/title before the ordinary result. Initialization failure falls back to the legitimate victory result and never leaves a black screen.
- Exiting/disconnecting/pagehide cleans up the finale, listeners and audio. Do not add host migration or change movement prediction.

- [x] Add failing integration assertions for objective-triggered presentation, previously downed local viewer, late snapshots, hidden host clock, disconnected cast member, terminal outcome and initialization-failure fallback. Include real two-client playback checks with peer transport and forced database fallback.
- [x] Run focused tests/browser checks to demonstrate the integration is absent before wiring it.
- [x] Wire the player into co-op frame/resize/cleanup paths; keep network broadcast outside the cinematic rendering branch. Preload avatar assets during round startup. Preserve shared timing when a tab is hidden and suppress obsolete gameplay prediction/camera work during the scene.
- [x] Run `npm test`, `npm run build`, `npm run test:browser:finale`, `npm run test:browser:polish`, `npm run test:browser`, and movement browser checks with peer and forced database fallback, using the existing local TURN fixture if required. All must pass; inspect logs and `git diff --check`. No claim of universal zero network latency.
- [x] Review the complete branch against the spec: every story beat readable, actual hand contact, shaft-relative motion and neck cut coherent, no resurrection, volume respected, scene cleanup verified. Record measured synchronization and asset provenance in README/verification notes. Request whole-branch code review according to the selected execution method.
- [x] Commit as `feat: play the synchronized finale on co-op victory`. Report the tested result and current branch; push the feature to main only when authorized by the user's integration direction and after all required checks pass.

## Execution handoff

Recommended: **Native** execution in this session. These five tasks share the clock, actor and scene interfaces closely, so implementing them together makes visual and synchronization adjustments easier. A whole-branch independent review follows implementation. **Subagent-driven** execution is also available, with fresh implementer/reviewer contexts per task.

The user approved this plan and instructed implementation. Native execution, independent review and the resulting mute-regression fix are complete; see `docs/verification/2026-10-19-coop-finale.md`.
