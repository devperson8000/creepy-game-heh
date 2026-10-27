# Microphone Hearing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task in this session.

**Goal:** Make enabled voice-chat noise attract Monochrome, with urgent sprint-and-scream pursuit and reliable quiet counterplay.

**Architecture:** Local audio analysis supplies bounded levels on existing authenticated movement packets. The host emits noises at authoritative positions into the existing hearing/navigation system. No recording or new gameplay transport.

**Tech Stack:** JavaScript, Web Audio, Three.js, existing Supabase RPC and WebRTC, Node tests, Playwright.

**Spec:** docs/superpowers/specs/2026-10-28-microphone-hearing-design.md

## Global Constraints

- Current game only; no Halloween/teaser changes.
- Preserve chase speed, stamina, objectives, safe time and existing movement protocol.
- Screams out-range sprinting; silence stops fresh clues. No unseen position tracking.
- Backward-compatible authenticated RPC; no additional action traffic.

## Review Focus

- Mute/reordered packets cannot resurrect a scream.
- Buffered movement cannot replay old voice noise.
- Microphone differences and brief spikes must not make ordinary noise scream.
- Closet sound reveals only an actually heard entrance, never bodies through walls.
- Downed/finale/arrival/disconnected states cannot create ghost clues.

### Task 1: Detector and voice noise
- [x] Add failing tests for quiet/background/spikes, sustained tiers, mute, sensitivity and invalid samples in tests/microphone-noise.test.js.
- [x] Implement src/microphone-noise.js: createMicrophoneDetector().sample(samples,now,{enabled,sensitivity}), reset(); voiceNoise(level,position).
- [x] Verify the detector and radius/closet behavior with node --test tests/microphone-noise.test.js.

### Task 2: Host hearing and urgent pursuit
- [x] Add failing tests using real createCoopSimulation and tickEnemy for scream range, sprint combination, loss of sound, freshness, malformed packets, hidden/dead players and movement replay.
- [x] Extend src/coop-simulation.js to accept sequenced microphone state on accepted inputs and emit bounded noises, with silence/TTL clearing. Extend src/enemy.js for urgent sound and heard identity; preserve navigation, catch and roaming.
- [x] Verify new behavior plus existing enemy/co-op/movement tests.

### Task 3: Microphone UI and gameplay packets
- [x] Connect detector to the actual local Web Audio analyser in src/voice-chat.js; expose noiseLevel, clear on mute/reset; add saved bounded micSensitivity in src/preferences.js and a small accessible control/meter in src/voice-chat.css.
- [x] Add voice fields only to top-level packets in src/coop-game.js. Gate arrival/finale/death/disconnection; preserve nine-field replay commands. Do not synthesize voice-event Foley.
- [x] Test real microphone capture, threshold/mute UI and stored sensitivity in browser.

### Task 4: Compatible backend validation
- [x] Generate a migration with Supabase CLI; extend current RPC validation to optional paired integer fields while retaining auth, bounds, rate limits and old clients.
- [x] Check SQL in a transaction against malformed, valid legacy and voice packet classes, then apply the non-destructive migration and confirm privileges.
- [x] Verify real authenticated co-op database fallback accepts new inputs without INVALID_INPUT and still opens drawers.

### Task 5: Full verification and integration
- [x] Run npm test, npm run build, targeted microphone browser checks and current map-release flow.
- [x] Review the final diff for lifecycle, privacy, multiplayer authority, input lag and seasonal isolation. Record concrete results in docs/verification.
- [x] Commit, integrate on main, deploy and smoke-check the current public game. Leave all Halloween worktrees intact.
