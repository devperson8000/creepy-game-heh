# Halloween gap closure verification — 24 October 2026

Implementation range: published `061305c` through the Halloween gap build. Deployment verification follows this record. The Halloween launch remains **31 October 2026, 16:00 Australia/Sydney**; `/testhalloween` requires its existing password. Needlelimbs is deliberately reserved until the selected licensed source/rig arrives.

## Automated checks

- `npm test`: **338/338** passed after the final review fixes.
- `npm run build`: passed. App 630.33 kB / 210.04 kB gzip, Three 584.21 / 149.49, deferred teaser 10.40 / 4.67. Existing large-chunk advisory remains.
- `bash supabase/tests/run-postgres.sh`: full local PostgreSQL 17 migration chain, RLS/authorization, expiry, rate limits, concurrent max-four approval and recovery passed. The matched remote project's transactional recovery fixture passed; all fixture writes rolled back. Migration `20261023215920_session_recovery` is applied.
- Real source keeper GLB tests cover owned clones/disposal, deterministic poses, the source skeleton and actual deformed glove/switch contact under 25 mm. Source/adaptation credit and CC BY-SA 4.0 are included.
- Joined wall tests cover 1/3/4-player layouts, no overlapping coplanar faces, closet aperture/back rays and collision/navigation agreement. Native browser audio confirms HRTF left/right direction and wall muffling; original monster/jumpscare hashes are unchanged.

## Browser coverage

Tests use Chromium/Playwright. The four-client transport harness suppresses native GL draw calls to isolate real networking/simulation; the separate scene checks render normally. This is not a physical-phone benchmark or four separate human networks.

- `check-gap-walls-browser.mjs`: moving views of rooms, closet and clear stairs; native emulated touch drawer hold, two-finger sprint, input release, portrait and teardown. Sample seed 356201715 has 49 wall chunks / 1,055 exterior faces. An explicit low-quality scene render at that sampled view reports 349 draw calls / 23,342 triangles; it is a diagnostic sample, not a frame-rate guarantee.
- `check-new-gameplay-browser.mjs`: password rejection/unlock, no public test buttons, all three independently opening cabinet drawers, fixed physical grille under camera movement, sprint/stamina and hunt release.
- `check-b2-polish-browser.mjs`: imported keeper, wall-mounted key insertion/turn, physical switch gesture, decoded neural voice peaks/duration, Previously/current edit/outro, portrait, actual held-E descent and walking approach, and teardown.
- `check-halloween-ending-browser.mjs`: all house escape beats, solo/team rescue, portrait, actual held-E solo victory without the optional Halloween Key and clean preview disposal.
- `check-gap-loading-browser.mjs`: B1 startup **and a real canvas click** request neither archive GLBs nor the deferred teaser chunk; B2 loads them on demand. Actual rejected shader warm-up keeps its alert/title and disposes owned resources while retaining the borrowed renderer.
- `check-current-teaser-browser.mjs` and `check-teaser-browser.mjs`: current edit in default playback/B2/replay, Previously → reserved corner → repaired head; no retired monster GLBs/voice imitation, mute, portrait, replay/cancel and teardown.
- `check-legacy-recovery-browser.mjs`: real pre-release guest snapshot timeout recovers without stopping its animation loop; movement resumes.
- `check-coop-recovery-browser.mjs`: four distinct authenticated clients share the original 65-cell map; acknowledged guest movement survives a short same-owner recovery, guest offline/on and same-tab reload preserve identity/progress, and three subsequent server-authorized host changes preserve keys/hunt/B2/finale and reach victory with one survivor.

- `check-opening-browser.mjs`: full house/empty-party/wall/fall/title/menu flow, all four voice lines, two-second pointer skip, reduced motion/portrait, delayed-load cancellation, focus loss and failed-film cleanup.
- `check-halloween-release-browser.mjs` against the **production preview bundle**: device date/preview query cannot unlock before the server deadline; exact trusted deadline enables the maze.
- `check-halloween-test-fullscreen-browser.mjs`: native entry, Escape from outer/inner frames, replay persistence, Back cleanup and mobile fallback.

## Final review

A fresh whole-branch review completed after the first review model became unavailable. Three Important findings were independently reproduced and fixed in one pass: inactive B1 pointer events loading teaser media; same-owner simulation recovery leaving old guest motion sequences stranded; missing pause on the disabled pre-release experience. Focused and full tests pass. No other material findings or deferred minor findings were reported.

Remaining external work is stated in the [gap audit](2026-10-23-halloween-story-gaps.md): selected Needlelimbs source/animation, physical-phone performance/comfort and a full human playthrough across separate networks. A hard crash resumes the last persisted checkpoint rather than guaranteeing the last unsent frame.
