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

---

# Monochrome 2 — First build slice (Level 0)

Route: `/monochrome2` (cinematic, unchanged) → **ENTER LEVEL 0** button on its title card → `/monochrome2/play` in the same page, no reload. `/monochrome2/play` can also be opened directly. It reuses the existing Level 0 game (`backrooms.js`) through a `variant:'monochrome2'` option; `/backrooms` behaves as before.

## Release timer
Gameplay is sealed until a timer opens. **The time is not decided yet**, so the gate stays sealed ("release time to be announced"). Set it without a code change via the `MONOCHROME2_RELEASE_AT` environment variable (ISO timestamp, e.g. `2026-12-05T20:00:00+11:00`) in Vercel, or edit `MONOCHROME2_RELEASE_AT` in `src/monochrome2-release-time.js`. The server clock decides (`/api/monochrome2-release`) and the client fails closed. Local `npm run dev` only: `?unlock=1` skips the timer. Like the existing map release, this gates the page, not the shipped bundle.

## Entities
`src/monochrome2-entities.js`. `monochrome` is live and wears the rebuilt metal-head body (scaled to 2.5 m to fit the 2.8 m ceiling) until a model is imported: set `MONOCHROME_SLOT.modelUrl` to a GLB path (a failed load falls back to the metal-head). `bacteria` stays reserved as Level 0 defined it (lower layer, awaiting its model): nothing is simulated or drawn for it. Player model: `BACKROOMS_PLAYER_MODEL` is still `null`.

## Monochrome (all numbers in `src/monochrome2-tuning.js`)
- Senses: footsteps (walk 12 m, sprint 30 m, crouch-walk 2.5 m), interactions, beam wobble (16 m), falls (32 m, urgent), microphone tiers in co-op. Each wall between sound and him multiplies reach by 0.62; the closed pitfall door counts as a wall. Sight: direct line only, 22 m standing, half crouched, all-round inside 3 m.
- States: patrol → investigate the last heard point → chase → search after losing you.
- Speed retune: Monochrome 1's 1.8 / 2.65 / 3.95 scaled by Level 0's sprint ratio: patrol 4.5, investigate 6.6, chase 9.8 vs walk 5.4 / sprint 9.2, rising to 10.6 with progress. Half speed on the beams.
- Telegraph: positional servo whine and jaw clicks, audible to 34 m (sight is 22 m), louder/faster/higher as he nears, muffled by walls.
- Catch: a hit downs the player (jumpscare, then floor view); a teammate revives with a 3 s hold of F; the round fails when the whole team is down (solo = team of one).

## Harder ending
Escalation tiers (ladder sections, key, door, exit door raise his speed, hearing and sight); longer objective holds; loud objectives, with the lit exit door acting as an alarm; each player can be revived only twice; a downed player bleeds out after 75 s (**my addition, not in the brief**: otherwise a downed teammate could stall the exit forever); the exit needs every player who is not lost.

## Verification
`npm test`: the 31 pre-existing Monochrome 1 / Halloween failures are unchanged; new tests in `tests/monochrome2-gameplay.test.js`. `npm run build` passes. Not yet checked in a real browser (none was available): rendering, audio, jumpscare, lobby flow and live co-op still need a playthrough.
