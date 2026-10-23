# Halloween Story Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; the user has approved the design and autonomous publication. One fresh whole-branch review follows integrated verification.

**Goal:** Deliver the connected Halloween house escape, improved metal Monochrome/audio, historical teaser recap and polished B2 encounter, then report remaining gaps.
**Architecture:** Shared creature/head and local speech assets; pure timelines sampled by existing Three.js renderer; extend authoritative finale record with a story variant and duration. Reuse the opening house and existing private test/lifecycle infrastructure.
**Tech Stack:** JavaScript, Three.js, Web Audio, offline neural speech, Vite, Node tests, Playwright.
**Spec:** docs/superpowers/specs/2026-10-23-halloween-story-design.md

## Global Constraints
- Preserve release: October 31 2026 4 PM Sydney; password-only /testhalloween; no public test options.
- Preserve three drawers/cabinet, clear stairs, fixed grilles, walk/sprint/chase 4.6/6.2/5.5, stamina 8/1.1/6 seconds, 3–6 AM in 90 active seconds.
- Original monster/jumpscare recordings unchanged. Historical recap uses original head and ends before any walkout.
- Halloween solo and co-op use the house ending; clocks/outcomes authoritative in co-op and independent of render/asset load.
- No Needlelimbs replacement or claimed Hooded Wanderer import. Reduced motion, mobile framing, mute/volume, disposal and tester teardown apply everywhere.

## Review Focus
- Late loading, seeking and background tabs must not desynchronise speech/recap or award premature victory.
- Solo, downed, disconnected or reduced co-op casts must reach an ending without requiring a missing helper or asset.
- Emergency exit and B2 panel must be mounted/reachable and retain server-side proximity and optional-quest separation.
- Reused house/recap/creature resources must be owned and disposed without breaking live gameplay or replay.
- Camera/wall/floor rescue transitions must be continuous, visible on portrait screens and readable under reduced motion.

### Task 1: Metal form and audibility
Files: src/mechanical-head.js, src/monster-audio.js, src/teaser-metallic-voice.js, src/game.js, src/coop-game.js, src/jumpscare.js, menu scene; tests for head geometry and audio profile.
Interface: attachMechanicalHead(body) returns {root,sample,dispose}; createMonsterAudio accepts metallic; 28 m maze range.
- [x] Write failing range/head ownership tests, observe RED, implement shared head mount and richer metal processing; wire Halloween game/menu/jumpscare only.
- [x] Verify audio peaks and original checksums, focused suite, commit.

### Task 2: Historical recap before the teaser
Files: new src/teaser-recap.js; modify teaser-playback, teaser-timeline and B2 time consumers; tests/teaser-recap.test.js.
Interface: pure recapFrame(time) selects historical finale time or teaser-relative time; wrapper scene exposes existing {target,ready,render,dispose,error}; audio pauses/resumes matching the same time.
- [x] Failing tests for PREVIOUSLY, sever/head-drop sample and no walkout, seek/teardown; implement bounded recap using original finale scene/audio and then current teaser.
- [x] Verify both teaser edits, offsets and mute/late seek; commit.

### Task 3: House escape and authoritative gameplay integration
Files: new src/halloween-ending-{timeline,scene,audio,player}.js; extend opening-set, finale-state, game/coop integration, maze-world, game UI, test hub/scenarios; tests/halloween-ending.test.js and browser script.
Interface: HALLOWEEN_ENDING_DURATION; halloweenEndingFrame(time,{count}) pure poses/camera; createHalloweenEndingScene({asset,cast,...}) sample/resize/dispose; createHalloweenEndingPlayer matches finale player; finale records variant:'house' and duration.
- [x] Failing state/timeline/geometry tests for solo/2–4, host completion, continuous wall crossing, distinct solo/team rescue and title; implement physical B1 service exit and sampled shared-house cinematic.
- [ ] Add password-only ending tester with scrub beats/casts and real solo/co-op completion checks; verify original finale remains; commit.

### Task 4: Mounted key panel, B2 direction and neural dialogue
Files: halloween-world/state/experience; new b2-dialogue.js, b2-director.js, b2-voice.js; public/audio/halloween/b2-* and credits; tests/B2 interaction/director/audio.
Interface: shared B2 timeline derives recap/teaser start/end; b2Frame(elapsed,entryPose) returns continuous camera and gesture values; audio update(time,{muted,volume}) schedules matching cues.
- [x] Failing panel-to-wall bounds/proximity and camera/gesture/subtitle tests; mount backing plate, animate key and indicator, improve authored hood/robe/hands/desk/switch/light.
- [x] Generate local neural speech with existing licensed tooling, verify full-file duration/peak and timing; implement audio-clock scheduling and smooth scene entry/exit; commit.

### Task 5: Integrated verification, audit and publication
- [ ] Run full Node suite and build; sequential browser checks for new solo/co-op ending, B2/teaser recaps/voices, actual key panel interaction, opening, drawers/closets, release gate and private tester lifecycle. Capture/review representative frames.
- [ ] Fresh final review; one evidence-backed fix pass. Audit assets, gameplay, presentation and deployment for remaining gaps and document priorities.
- [ ] Commit, fast-forward original checkout, push main, verify deployment SHA/alias and live private/public flows. Report shipped changes and evidence-backed gaps.
