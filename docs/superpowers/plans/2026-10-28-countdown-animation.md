# Countdown Animation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline, with one final independent review.

**Goal:** Add the approved five-minute timer escalation and usable fullscreen countdown, deferring character/cinematic work.

**Architecture:** A pure server-clock presentation/gate module drives a scene-owned DOM dialog and optional generated audio. The existing countdown owns construction and disposal; no gameplay or backend changes.

**Tech Stack:** JavaScript, CSS, existing Web Audio and release clock, Node tests, Playwright.

**Spec:** docs/superpowers/specs/2026-10-28-countdown-animation-design.md

## Global Constraints

- Deadline stays 2026-10-31T16:00:00+11:00.
- Timer only; character/cinematic animation is deferred.
- Effects begin only with confirmed server time, never active gameplay.
- Fullscreen/dialog/audio resources follow the countdown lifecycle.
- Keep main-game mechanics and update-only asset gates unchanged.

## Review Focus

- Unknown/backward clock and late visits must not cause premature or repeated takeover.
- Close/reopen, Escape, focus/inert and native fullscreen races must remain usable.
- Hidden tabs, mute and disposal must silence owned sources immediately.
- Mobile numbers/buttons must remain visible, including long day/hour readouts.
- Reduced motion must suppress all new movement without breaking timer/control state.

### Task 1: Presentation and focus gate
- [x] Write failing tests for five-minute/one-minute/thirty-second/zero boundaries, unknown clock, readout formatting and dismiss/once/late-visit behavior.
- [x] Implement src/halloween-countdown-state.js with sampleCountdownPresentation(release), countdownReadout(seconds), createCountdownFocus({seen,onSeen}).
- [x] Verify Node regressions and existing deadline tests.

### Task 2: Immersive timer and audio
- [x] Write browser regressions against the real menu with a controlled release response, covering phases, native fullscreen, Escape/focus, phone layout, reduced motion, hidden-tab/mute/disposal and zero state.
- [x] Implement src/halloween-countdown-view.js and src/halloween-countdown-audio.js. Integrate with src/halloween-countdown.js; extend existing CSS and pause covered menu hallway rendering.
- [x] Run real Web Audio/browser checks and inspect rendered desktop/phone screenshots. No character or scripted Monochrome shots.

### Task 3: Verification and release
- [x] Run full isolated npm test, production build, updated menu regressions and timer/browser checks.
- [x] Have an independent reviewer check lifecycle, timing, focus, sound and deferred scope; fix confirmed important findings with regressions.
- [x] Record evidence, commit and integrate on main, verify deployment and ordinary pre-event live menu. Preserve Halloween worktrees.
