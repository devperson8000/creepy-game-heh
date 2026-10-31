# Halloween Final Polish Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; one independent final review.

**Goal:** Publish the 20:00 Sydney delay promptly, then polish and verify the existing Halloween experience.
**Architecture:** Shared deadline/version drives API and both timer views; public and private builds retain separate entry points. Existing Three.js scenes and asset ownership remain intact.
**Tech Stack:** JavaScript, Three.js, Web Audio, Vite, Node tests and Playwright.
**Spec:** docs/superpowers/specs/2026-10-31-halloween-final-polish-design.md

## Global Constraints
- Release 31 October 2026 at 20:00 Sydney/AEDT = 09:00 UTC.
- Preserve approved story, balanced gameplay, original Monochrome and original audio; no new monsters.
- Protected tester contains the same final feature assets; no private controls in public game.

## Review Focus
- The old 16:00 crossing must not unlock fresh sessions or suppress the new launch film.
- Camera framing, low resolution, narrow screens and reduced motion preserve important subjects and text.
- Models/textures/audio load successfully and dispose without callbacks resurrecting scenes.
- Quest/panel/closets/decorations do not clip or obstruct navigable routes.
- Gameplay remains playable before release and seasonal session selection remains host-controlled.

### Task 1: Delay now
- [x] Update deadline regression to assert 09:00 UTC/20:00 Sydney and old deadline remains locked; watch it fail.
- [x] Update src/halloween-release-time.js, both timer labels, per-release version and shared fixtures in main/tester.
- [x] Run release/countdown tests and build, commit/push both, confirm live API is unreleased with new deadline.

### Task 2: Asset audit and polish
- [ ] Inventory update models/materials/audio/scenes, read existing audit and run baseline tests.
- [ ] Render opening, map, key panel, B2/monitor, teaser, ending and launch film; record concrete defects and polish targets.
- [ ] Implement material/light/geometry/animation/UI refinements in existing modules, with regression tests for behavioral defects.
- [ ] Verify referenced assets exist, public/private final feature consistency, rendered layouts and scene cleanup.

### Task 3: Complete release verification
- [ ] Integrate existing seasonal feature modules into the public release gate; preserve current map/microphone hunt and private route boundary. Add explicit before/at-deadline public production-flow tests.
- [ ] Run full appropriate suites/builds and relevant browser flows; independent final review and regression fixes.
- [ ] Publish only authorized release code and protected tests; verify live commit IDs, deadline, assets and session gates.
- [ ] Record verification and report material limitations accurately.
