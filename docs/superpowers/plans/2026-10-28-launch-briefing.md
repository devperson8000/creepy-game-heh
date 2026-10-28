# Launch Briefing Implementation Plan

> **For agentic workers:** Independent scene and audio work may run in parallel under superpowers:dispatching-parallel-agents; parent integrates and verifies, then requests one independent review.

**Goal:** Implement the approved narrated Halloween briefing and uploaded-song title ending at countdown zero.

**Architecture:** Lazy-loaded scene-owned player samples one absolute timeline. Predecoded dialogue/music/static use a single audio-clock mapping; three measured music accents drive DOM word visibility. Existing countdown dialog owns playback and cleanup.

**Tech Stack:** Existing Three.js/avatar assets, Web Audio, offline Kokoro TTS, ffmpeg, JavaScript/CSS, Node tests and Playwright.

**Spec:** docs/superpowers/specs/2026-10-28-launch-briefing-design.md

## Global Constraints
- Existing release deadline and main gameplay stay unchanged.
- Original Monochrome only; no Needlelimbs/metal head/new monster.
- Keep the actual uploaded audio; three measured accents, no arbitrary beat timer.
- No premature public playback or debug controls; assets preload only in confirmed final minute.
- Skip/mute/reduced motion, hidden pause and full disposal are required.

## Review Focus
- Loading/autoplay failures must never trap the menu.
- Audio-clock/title/static boundaries must remain aligned after mute/resume/hide.
- Replayed or disposed players must not leave audio or render loops.
- Portrait/ultrawide text and camera framing must not crop.
- Once-only zero triggers must respect dismissal and hidden/late visitors.

### Task 1: Audio assets and clocked score (independent)
- [x] Extract AAC, measure accents, record metadata/hash, generate high-quality individual narration cues and stressed final NOW.
- [x] TDD an owned launch-briefing-audio module with preload, start/resume, time, mute/volume, hidden pause and disposal. No narrator/score overlap with the silent gap.

### Task 2: Cinematic scene (independent)
- [x] Build launch-briefing-scene.js with deterministic sample(elapsed), real animated hazmat walking, decorations/clues and original Monochrome only. Keep spoilers restrained.
- [x] Test camera/actor/layout/absolute sampling and disposal; render real desktop/phone frames.

### Task 3: Timeline/player/integration
- [x] TDD static/fades/music/three title-word/CTA boundary sampling.
- [x] Implement DOM player, subtitles, controls, clock/audio sync, safe fallback and lifecycle.
- [x] Integrate lazy final-minute preload, once-only zero start and post-release replay with the existing timer dialog.

### Task 4: Verification/release
- [x] Run full suite/build and browser checks for actual cue sync, title safety, hidden/mute/pause, skip/cleanup and ordinary pre-event isolation.
- [x] Independent review and regression fixes; record verification.
- [ ] Publish main and verify the live ordinary menu and gated zero/replay path. Preserve update branches.
