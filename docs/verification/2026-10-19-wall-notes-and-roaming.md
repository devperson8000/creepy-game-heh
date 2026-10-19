# Wall warnings and continuous roaming

## Change

Storage rooms receive deterministic, worn paint warnings on real solid wall faces. Examples include IT HEARS YOU, DON'T LET IT SEE YOU, THE LIGHT WON'T SAVE YOU and DON'T WAIT FOR SILENCE. Larger basements use additional unique messages. Transparent, rough standard materials respond to scene lighting and the torch. The decorations have no interaction target and are excluded from interaction ray meshes; the code clue remains separate.

Search pauses are capped at two active seconds, including time already spent stationary. A movement watchdog abandons blocked investigations. A separate area watchdog detects twelve seconds of pacing within four meters. Both choose another reachable room and commit to roaming for eight seconds without accepting unseen noise distractions. Sight immediately interrupts that commitment. Valid static routes are retained until arrival or collision; repeated replanning at corners previously produced a long stall on seed 2026. Movement still uses the collision sweep and existing patrol/investigation/chase speeds. The same AI drives solo and authoritative co-op. Pre-six dormancy remains controlled by the existing clock.

## Verification

- `npm test`: 222 passed. New behavioral checks cover search duration, unreachable investigations with repeated sound, noise at the monster's feet, and moving sound that previously caused local pacing.
- Real scene geometry/navigation checks simulate 120 seconds on each of nine furnished maps: seeds 42, 137 and 2026, with 1-, 3- and 4-player layouts. Each run visits at least five six-meter regions, stays inside navigation collision bounds and has no stationary interval beyond the two-second allowance plus simulation-step tolerance.
- Wall geometry checks cover all three basement sizes: one unique note per storage room, backed by solid cells, facing walkable space and excluded from interaction ray meshes.
- `npm run build`: passed; existing Three.js chunk-size advisory remains.
- `npm run test:browser:coop-hunt`: passed with two authenticated clients on database transport, including arrival freeze, shared release, paused guest and late warning cleanup. Displayed host/guest clocks both read 4:04; release samples were 90.0085 / 89.9419 seconds.
- Wall-note browser check: rendered the first three actual torch-lit notes with no page errors. Reviewed the saved 1200x800 scene captures and adjusted paint/font for wall contrast. Repeat with `npm run test:browser:wall-notes`; captures go to ignored `work/creepy-wall-note-*.png`.

These checks exercise generated maps and existing gameplay flows; they do not guarantee behavior on a physically disconnected custom map or universal browser/network performance.
