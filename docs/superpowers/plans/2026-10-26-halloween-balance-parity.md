# Halloween balance parity implementation plan

> **For agentic workers:** Execute the approved change inline; no additional approval is needed.

**Goal:** Match the current public game's basement balance in Halloween solo, co-op and tests.

**Architecture:** Port the small map-generation, objective-placement and chase-speed changes into the existing Halloween implementations. Keep the seasonal layout flags, optional quest, B2, mechanical head, soundscape and endings.

**Tech Stack:** JavaScript, Three.js, Node tests, Playwright, Vite/Vercel.

**Spec:** User-approved explanation in this conversation, 26 October 2026.

## Global constraints

- Maps: 45/45/49/53 for 1/2/3/4 players; rooms: 17/17/20/23; three drawers per room cabinet.
- Four distinct key rooms using public placement rules; code in the first ceil(55%) of rooms sorted by route distance.
- Movement 4.6 walk / 6.2 sprint; eight-second sprint, 1.1-second recovery delay, six-second recovery, 25% restart threshold; chase 6.2.
- Keep sight/hearing/pursuit/catch rules equivalent; preserve legacy drawer-row compatibility and Halloween-specific gameplay.
- Do not change public main. Deploy the Halloween feature/test branch only.

## Review focus

Check all team sizes and multiple seeds; co-op host/guest objective consistency; reachable keys and optional quest targets; collision-safe roaming on smaller maps; and stale tester assumptions about 55-cell maps/72 drawers.

## Tasks

- [x] Capture the normal game's deterministic outputs at the current public commit as a small parity fixture; add failing parity/chase tests and update the approved map/stamina expectations.
- [x] Port map sizes/room counts, room-based key placement, nearer code and chase constant in `maze-layout.js`, `game-state.js` and `player-movement.js`.
- [x] Verify parity tests, complete suite, build, and real Halloween test-page/solo/co-op flows. Update browser expectations for 45-cell duo maps and 51 drawers.
- [ ] Review the scoped diff, commit/push only the Halloween branch, confirm deployment and live tester access.
