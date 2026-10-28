# Halloween countdown animation

Implements the user's corrected scope: timer effects and fullscreen only. Character animation and the cinematic reveal are deferred. The October 31, 2026, 4 PM Australia/Sydney deadline, main gameplay, microphone hearing, seasonal gameplay gates and existing creature animation are unchanged.

## Behavior

- Confirmed server time starts stronger glow/embers and background dimming at five minutes, increases the seconds pulse at one minute, and opens an immersive timer at thirty seconds.
- The card's Fullscreen timer button is available immediately and requests native fullscreen from its click. Automatic focus uses a fullscreen-sized dialog without requesting native fullscreen. Close/Escape restore the menu and keyboard focus; the last-thirty-second view is recorded on entry so reloads cannot repeat it automatically.
- Sound is explicitly enabled, uses generated low atmosphere/heartbeat, respects saved game volume, stops while hidden/muted, and closes with its owner. There are no new recordings or update-only sample requests.
- Reduced motion removes new pulses/ember movement/light treatment. The covered hallway renderer pauses. Waiting rooms and gameplay never own this timer.
- Zero holds a readable 00:00 and a simple completion message with refresh/back controls. No character, lunge, new cutscene or cinematic hit was implemented.

## Verification

- Isolated `npm test`: **288 passed**, zero failures; production build passed. Existing chunk-size advisories remain.
- `node --test tests/countdown-presentation.test.js tests/halloween-countdown.test.js`: 11 passed, covering boundary phases, unknown clocks, readout formatting, once-only persistence, late arrival, manual opening and the fixed Sydney deadline. Initial tests failed before implementation.
- `node scripts/check-countdown-animation-browser.mjs`: passed the real menu with controlled server responses across five-minute/one-minute/thirty-second/zero transitions, native fullscreen, automatic immersive focus, Tab/Escape, focus restoration, real AudioContext scheduling, mute, hidden-tab silence/focus suppression, stored zero volume, reload guards, 390/320px reduced-motion layouts, unknown-clock gating and disposal when entering actual solo gameplay. No runtime errors.
- Browser regressions caught native-exit focus returning to body and hidden-tab dialog opening; both failed before their fixes and pass now.
- Independent review found one Important repeat-guard issue: reload before zero could repeat auto opening. The reconstruction test failed; recording the event on first visible entry fixed it. The browser verifies reload while still in the final thirty seconds. No remaining Important/Critical review findings.
- `GAME_TEST_URL=http://localhost:5186 node scripts/check-release-menu-browser.mjs`: passed ordinary desktop/mobile menu, old test URL isolation, no map announcement, multiplayer/back, solo/pause/return and no leaked tester links.
- Desktop and 320px fullscreen screenshots were visually reviewed. Digits and controls fit; no character or scene assets were added.
