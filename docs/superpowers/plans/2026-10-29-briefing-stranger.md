# Stranger-hosted briefing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; independent final review under superpowers:requesting-code-review.

**Goal:** Polish the launch film with the existing hooded stranger and bm_george TTS.
**Architecture:** Film-specific narrator rig wrapper and absolute-time director feed the existing scene/player/audio clock. Reuse source asset, generate measured dialogue, preserve all finale/release cues.
**Tech Stack:** Three.js, Kokoro, ffmpeg, Web Audio, Node/Playwright.
**Spec:** docs/superpowers/specs/2026-10-29-briefing-stranger-design.md

## Global Constraints
- Original Monochrome, unchanged main gameplay/release gate, no Needlelimbs/metal form/testers.
- Static94, music96.25, exact existing score accents; no music re-encoding.
- Existing stranger model, bm_george voice, and required attribution.

## Review Focus
- Model failure/late load/close during load: fallback and no reattachment or leaked resources.
- New narration durations fit the existing subtitle slots without overlap.
- Host and camera fit phone/landscape/ultrawide; no props intersect hood/hands.
- Seeking/reduced motion preserve deterministic poses; movement matches travel.
- Slow rendering/audio unlock must not desynchronize static/title cues.

### Task1: Narrator and voice
- [x] Add failing real-model identity/gesture/seek/disposal tests.
- [x] Bring in keeper asset/resources under launch-only paths and implement narrator rig gestures.
- [x] Regenerate narration with bm_george and matching B2 EQ; validate duration windows/peaks and voice manifest.

### Task2: Scene/player polish
- [x] Add deterministic host-shot director and stage tests; fix avatar gait, lighting shutoffs, transition matte and protected framing.
- [x] Bound scene readiness alongside audio; cancel immediately on skip/dispose and avoid repeated identical scene renders.
- [x] Browser-check film host shots, fallback/late load, actual title clock and static transitions, all viewport sizes.

### Task3: Verify/release
- [x] Full tests/build, pre-release asset gate and existing countdown/browser regressions.
- [x] Independent review; fix findings and record verification.
- [ ] Publish main and verify production deployment plus live release handoff/ordinary gameplay.

### Task4: Private Halloween tests (user steering)
- [x] Add authorized `launch-countdown` and `launch-briefing` cases with real countdown/film and isolated injected clock/store/onEnter; no global release mutation.
- [x] Provide last-minute/30s/10s and static/music shortcuts, replay/fullscreen/back cleanup.
- [x] Sync shared modules/media with `scripts/sync-launch-briefing-tests.mjs`; verify identical hashes and existing password authorization.
- [ ] Run private suite/build and end-to-end authenticated local/live tests; publish only to the tester branch/alias.
