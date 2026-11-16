# Monochrome 2 — Gameplay foundation

## Current boundary

- `/monochrome2` remains the finished cinematic and teaser-facing introduction.
- Gameplay will be a separate route and lifecycle, rather than being added to the 78-second intro update loop.
- The intro's stair/shop collision audit is reusable as a reference for authored cinematic paths; real gameplay needs continuous movement collision and interaction validation.

## Existing systems to reuse

- `src/player-avatar.js`: shared survivor model, rig, animation sampling and foot geometry.
- `src/backrooms-world.js`: the current Level 0 world geometry, lighting and environment construction.
- `src/coop-game.js`, `src/coop-motion.js`, `src/peer-gameplay.js` and `src/lobby-client.js`: existing co-op/session and replicated movement foundations.
- `src/preferences.js`: existing settings and reduced-motion preferences.
- Existing audio and interaction helpers should be reused where they fit; Monochrome 2 should not fork copies of working systems.

## Proposed module boundary

| Module | Responsibility |
| --- | --- |
| `monochrome2-game.js` | Gameplay lifecycle, state ownership, pause/exit and cleanup |
| `monochrome2-player.js` | First-person camera, movement, stance and survivor presentation |
| `monochrome2-collision.js` | World collision, door passage, stair traversal and safe spawn checks |
| `monochrome2-interactions.js` | Contextual use, pickups, doors and environmental interactions |
| `monochrome2-objectives.js` | Objective state and checkpoint progression |
| `monochrome2-audio.js` | Gameplay-only ambience, positional effects and music state |

The current cinematic collision audit lives in `src/monochrome2-collision.js`; gameplay collision should build on the same scene measurements but must use continuous player movement checks rather than the cinematic's authored-path sampling.

## First playable milestone

1. Enter the playable scene from the cinematic title without reloading the page.
2. Spawn on a verified walkable floor with no wall, shelf, stair or door overlap.
3. Support mouse-look, keyboard movement, sprint/crouch, collision-safe stairs and door interaction.
4. Add one small objective loop (explore, find an item, unlock a route, reach a safe point) before adding enemies or co-op complexity.
5. Add checkpoints, sound and performance budgets only after the movement loop is stable.

## Decisions to make during gameplay design

- Single-player first, or co-op from the first build.
- Whether the first level is the same Level 0 layout used in the intro or a new Monochrome 2 map.
- The player's first objective and what the first encounter should teach.

Keep these decisions open until the first playable slice is designed; do not change the current intro or the existing game modes to make the scaffold fit.
