# Cinematic Polish Implementation Plan

> Execute inline using superpowers:executing-plans; one fresh whole-branch final review.

**Goal:** Better hands/grips, emotional speech and a fully visible teaser monitor.
**Architecture:** Shared authored skinned hand; timed key contact and existing shot clocks; offline speech clips with per-line mix; aspect/viewport-aware monitor camera.
**Tech Stack:** Three.js, WebAudio, Kokoro-ONNX, FFmpeg, Node and Playwright.
**Spec:** docs/superpowers/specs/2026-10-24-cinematic-polish.md

## Global Constraints
- Preserve Halloween2026 31October16:00 Sydney gate, private tests, dialogue scripts/shot timing and pending Needlelimbs.
- Original monster/jumpscare MP3s and metallic bus untouched. Preserve volume/mute and cancellation.
- Camera-attached hands retain depth occlusion; shared assets have explicit ownership.

## Review Focus
- Pinching pads stay on the bow through insertion/twist; tip enters the actual slot.
- All four TV corners remain visible through world meshes and controls at small/wide viewports.
- Skinning, mirrored hands, wall penetration and resource disposal remain correct.
- Speech fits cue windows; late/unmuted playback never restarts old lines or clips final words.
- Co-op/ending reuse and pre-release gating remain unchanged.

### Task1 Monitor
Files src/b2-director.js, src/halloween-experience.js, src/halloween-game.css; tests/b2-polish.test.js; browser cinematic check.
Interface b2Frame(time,{entry,aspect,fov,viewportHeight}) fits complete physical monitor.
- [ ] RED projection of all four corners across aspect/FOV/height; reproduce rendered test crop/overlay.
- [ ] Fix height/width fit and compact watching controls; GREEN projection/browser shots; commit.

### Task2 Hands
Files new src/cinematic-hand.js; src/opening-hands.js; src/b2-key-panel.js; tests/cinematic-hands.test.js.
Interface createCinematicHand({side,gloved}) returns root,mesh,bones,fingerTips,pose,pinch,dispose; shared authored indexed skin geometry with owned rig/materials.
- [ ] RED continuous skin/independent poses and actual key pad/blade contact tests.
- [ ] Implement anatomically shaped palms/three-joint fingers/opposable thumb and cuffs; integrate opening/torch/key; verify pose seeking, wall occlusion and screenshots; commit.

### Task3 Speech
Files opening-dialogue/audio, needlelimbs-timeline, teaser-audio, versioned MP3s/credits; reproducible offline script, audio tests.
- [ ] RED per-line delivery gains/room response and cue fit/decode checks.
- [ ] Generate distinct projected/uneasy/startled/fearful and radio/survivor takes; preserve timing and source recordings; GREEN audio/runtime tests and review; commit.

### Task4 Finish
- [ ] Full tests/build; rendered opening hands/key poses, complete TV corners at desktop/portrait/ultrawide, speech decode/mute/cancel, B2/teaser/ending reuse.
- [ ] Fresh full-branch review; one RED→GREEN material fix pass. Record evidence and remaining limits.
- [ ] Merge/push main under existing authorization; verify Vercel SHA/alias and live private/public flows.
