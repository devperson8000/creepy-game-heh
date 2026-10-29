# Camcorder briefing verification — 29 October 2026

Scope: compact the approved launch film, add a contained 4:3/24mm VHS picture and build Monochrome's distant hints into a planted-eye reveal, finished question, then charge. Main gameplay/map/difficulty, the original creature/recording and October 31 16:00 Sydney release gate remain unchanged. Shared film and assets are identical in main and the authorized Halloween tester.

The runtime schedule derives dialogue timing from decoded clip durations; the source manifest retains authoring coordinates for existing animation. Warning starts at 40.455958s, “What's that?” at 43.055958s, sprint at 44.258583s and NOW/static at 45.984583s. Static fades fully before a 0.12s black/silent gap; music starts at 47.354583s, seeking to source 8.75s. HALLOWEEN/HAS/ARRIVED appear on three separate synth swells at source 10.691701/21.358458/32.024218s. Score SHA256 remains `2c0b7c89d70c5143774f997ff7352b12ac09421d4ef7c3885281d2f5abada073`. All 250 MP3 packets in the short monster cue match the original source prefix.

## Automated checks

- Main isolated checkout: 326/326 tests; private tester: 407/407. Both production builds pass, with the existing main/Three chunk-size advisory.
- Schedule, planted/question/charge boundaries, real model gait sampling, source-offset/loop/pause/mute/autoplay/disposal, lens/aspect/stamp/reduced-motion and existing gameplay regressions pass.
- Actual Web Audio source-clock versus DOM title mutation: measured 0/0/0ms at the three separated swells in Chromium. This verifies scheduling; display latency can vary by hardware.
- Rendered camcorder browser: desktop, phone, short landscape and ultrawide retain 4:3 aperture, readable stamp/titles, compiled post shader and contained controls. Distant eyes, stationary question and moving charge inspected in screenshots. Reduced-motion, failed/late models, repeated disposal and no-WebGL/audio fallbacks pass.
- Countdown/release browser: zero crossing, once-only launch, replay, hidden crossing, fullscreen, focus restoration, unknown-clock fail-closed and gameplay cleanup pass.
- Public main-game gate browser: ordinary solo still uses the balanced plain 45-cell map and requests no launch/update audio/models before release.
- Protected tester browser: password authorization, countdown → same film, direct film, observed stationary → question → sprint trace, static/music/titles, replay/back and short-screen layout pass.
- Added a red/green delayed-authorization browser regression for preview shortcut readiness. Command buttons stay disabled until the authorized preview signals it is running, preventing lost early seeks.
- Shared-file sync verifies 49 identical modules/assets/tests. Private test controls remain confined to the tester branch.

Independent final code review found no actionable blockers and independently passed 34 focused tests. The subsequent tester-readiness fix passed its targeted browser regression and the complete private suite.

## Published verification

Main film commit `e72070db13bc44ada4060287022863cf9bc74a82` is READY as deployment `dpl_Fau8CoeRevuwUU9nhQFWE2TfmSFP` on `creepy-game-heh.vercel.app`. Private film commit `44bebe6fe917268a828f524dc17d5bb69db6380a` is READY as preview deployment `dpl_4V1SZifWHaaVHSUHoypdhfeaJuac` on `monochrome-halloween-tests.vercel.app`; the private branch was not promoted to production.

Live public-game isolation and the complete countdown browser pass. Live private password/countdown/direct-film/buildup trace/static/music/titles/replay/back checks pass, as does embedded title/control safety in short landscape and narrow phones. Main root explicit suite passed 325/325 after fast-forward (isolated checkout's additional source-discovery test accounts for 326 there). Shared-file hash check remains 49/49. The subsequent documentation commit records these already-verified code deployments.
