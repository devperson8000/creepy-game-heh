# Halloween opening cinematic

The normal first page load now plays a 49.2-second first-person introduction, including the closing title. The street, empty party house, double hand-through-wall interaction, unpowered brick passage and open shaft are original procedural sets. The flashlight is withdrawn visibly; the protagonist recoils, retries, walks through the wall, trips and falls as the beam fades. The title fades before normal mode selection appears. Returning from gameplay does not replay the introduction. Existing co-op and authorized Halloween test-frame startup paths bypass it.

Holding the on-screen control, Space, or Escape for two uninterrupted seconds seeks to the title. A click or partial hold does not skip. Releasing, losing focus or hiding the page resets progress. Hold time uses elapsed input time even when rendering is slow; the film itself pauses in hidden tabs. Loading can also be skipped. Late resources dispose once; cancellation never opens an extra menu. Reduced-motion preferences (saved or OS) use the quiet title without allocating the film renderer or starting its sound.

Four original dialogue lines use offline Kokoro neural speech with a clear direct signal and subtle room response. Captions work even if browser autoplay is blocked; Enable sound unlocks audio through a user gesture. Existing volume preferences apply. Finished clips total 80,816 bytes; no speech models or inference dependencies ship. Full-file decoded peaks are 0.747, 0.740, 0.761 and 0.659 (below clipping). Source details and attribution are in `public/audio/opening/CREDITS.md`. The existing monster recording still matches its pre-change SHA-256.

Validation:

- `npm test`: 267 tests passed.
- `npm run build`: passed; existing large-chunk advisory remains.
- `GAME_TEST_URL=http://localhost:4173 node scripts/check-opening-browser.mjs`: full story, all four timed captions/voice responses, title/menu handoff, released/clicked skip, two-second pointer hold, solo start, multiplayer/back, reduced motion, phone layout, skip during loading, failure/cancellation cleanup and focus-loss reset passed without runtime errors. Lifecycle fixtures use the local Vite server.
- `node scripts/check-opening-audio-browser.mjs`: all four clips decoded and produced audible output through the real Web Audio graph; gesture unlock, mute and context disposal passed. Sampled output peaks remained below clipping.
- `node scripts/check-opening-shots-browser.mjs`: deterministic rendered street, porch, entry, living room, open hand, first disappearance, recoil, retry, second disappearance, wall crossing, dark passage, shaft and falling shots captured and reviewed. Phone street framing and renderer teardown also passed. Screenshots remain in ignored `work/opening-shots`.
- `GAME_TEST_URL=http://localhost:4173 node scripts/check-release-menu-browser.mjs`: former production test URLs, mode selection, phone layout, multiplayer/back and solo/pause/menu return passed.
- `GAME_TEST_URL=http://localhost:4173 node scripts/check-halloween-test-fullscreen-browser.mjs`: private tester, native fullscreen, Escape from the parent and iframe, replay, cleanup and phone fallback passed.

The local production build also passed `node scripts/check-opening-live-smoke-browser.mjs` on a 390 × 844 viewport: all four voice assets, visible hold control, keyboard hold-to-title, teardown and mode menu.

A short deploy smoke check is available as `GAME_TEST_URL=<deployment> node scripts/check-opening-live-smoke-browser.mjs`; it exercises a normal phone-sized opening, all four local voice assets, hold-to-title, teardown and mode selection.
