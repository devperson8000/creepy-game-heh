# Found-footage briefing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline and one independent final review under superpowers:requesting-code-review.

**Goal:** Remove dead air and deliver the specified4:3/24mm VHS camera treatment.
**Architecture:** One duration-derived schedule owns dialogue/static/music; a piecewise scene-time mapping retains the existing authored animation. An owned post pass and bitmap HUD provide the tape look inside a responsive4:3 aperture.
**Tech Stack:** Three.js/WebGL, Web Audio, JavaScript/CSS, ffmpeg, Node/Playwright.
**Spec:** docs/superpowers/specs/2026-10-29-briefing-camcorder-design.md

## Global Constraints
- Same stranger/voice/original creature and supplied music; no new monsters/gameplay/tester exposure.
- Instant NOW/static and title accents, full static fade then brief silence, score seek8.75s and fade before first accent.
- Preserve release gate and private authorization; shared film must match in both builds.

## Review Focus
- No narration overlap or long unsounded/unchanging stretches; mute/hidden/resume respect the new source offset and bed loop.
- Genuine contained4:3 at all window sizes, readable titles/stamp/controls,24mm FOV and bounded jitter.
- Reduced motion/seek/pause do not accumulate transforms or animate noise while held.
- Missing models/audio/WebGL and late loads still support skip/exit and release all owned resources.
- Post-processing color conversion, target size, material/shadow cleanup and device performance.

### Task1: Compact schedule/audio
- [x] RED pacing, boundary/offset/loop tests; implement duration-derived cues and scene-time mapping.
- [x] Add loopable tape/fluorescent ambience; update scheduler, timeline and generator metadata without re-encoding score/voices.
- [x] Update existing boundary tests and private preview shortcuts to import shared constants.

### Task2: Camcorder picture
- [x] RED4:3 aperture/lens/jitter/timestamp tests; implement post-pass, bitmap HUD and deterministic camera motion.
- [x] Integrate contained film wrapper and safe responsive typography, bounded render resolution and owned cleanup.
- [x] Browser inspect desktop/portrait/landscape/ultrawide, actual pixels/ratio, reduced motion/fallback/late loads and music cue sync.

### Task3: Verify/publish
- [x] Sync exact shared assets/modules/tests to protected tester; verify hashes and authorization.
- [x] Full suites/builds, independent review and any regression fixes.
- [x] Publish main and tester; verify deployed commits and live countdown/preview/main isolation/layout.
