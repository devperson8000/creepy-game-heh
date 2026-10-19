# Co-op finale verification

Later changes are recorded in [the faster finale and 3 AM start verification](2026-10-19-faster-finale.md).

The menu/movement polish was pushed to `main` first in `36de932`. The cinematic is implemented in the commits following the approved design and implementation plan. Independent review completed. Its one Important finding, shared mute-state inconsistency, was reproduced in a real two-client browser test and fixed. The full suite and build passed again after that fix.

## Behavior checked

| Check | Result |
| --- | --- |
| Unit suite | 178 passed, 0 failed after the review fix. |
| Production build | Passed. The existing Three.js chunk exceeds Vite's 500 kB advisory threshold. |
| Full preview | A real 52-second production playback reached both winning-title lines. Replay, 2/3/4 cast changes, mute, mobile layout, Escape and repeated menu returns passed. |
| Character download failure | Preview showed an error; retry loaded successfully and returned cleanly to the menu. |
| Preview renderer failure | Error panel remained visible, retry recovered, and menu cleanup succeeded. |
| Co-op renderer failure | A constructor failure initially leaked an overlay; the reproducing browser test now passes and the authoritative victory screen appears. |
| Database finale | Two authenticated clients started the same ending, hid gameplay UI, progressed with a hidden host, caught up after a large time jump and reached victory. Sample clocks: 2.108 / 2.199 seconds. |
| Peer finale | The test counted actual peer snapshots, then verified the same ending/catch-up/victory flow. Sample clocks: 2.681 / 2.375 seconds. |
| Downed viewer | A downed teammate saw the cinematic, was included as rescued, and ended with escaped status. |
| Database movement | 194 local samples, 197 teammate samples, no reverse position snaps; maximum sampled teammate step 0.0564 m. |
| Peer movement | No reverse position snaps; maximum sampled teammate step 0.0701 m; actual peer messages counted. |
| Voice | Real fake-device microphone transport, speaking indicators, mute, permission-denial recovery, gameplay voice and peer movement passed. |
| Shared mute controls | Button → M and M → button both update the same audio flags and visible labels; real two-client regression passed after reproducing the original failure. |
| Solo regression | Arrival skip, pause focus, preferences, mobile layout, real keypad rejection/acceptance, capture, retry and elevator escape passed. |

These are measurements in the test environment, not promises of a universal frame rate or zero network latency. The managed Chromium policy disables non-proxied UDP; WebRTC checks used a temporary local TCP TURN fixture without changing that policy. Network/pose checks disable GPU drawing after normal scene startup so software rendering does not distort their timing; separate preview/shot checks used actual rendering.

## Decisions made during implementation

- Used the existing managed checkout on the `work` branch. This kept the previously approved work intact; moving the commits to another branch remains straightforward.
- Cloud skill helper scripts were not installed as local files, so task/test evidence was recorded in a local ignored ledger instead. This preserves the record but does not provide the helpers' automatic bookkeeping.
- Added a four-timestamp clock exchange because the first database snapshot arrived about one second late. It compensates for device clock differences and transit time; unequal outbound/return delays can still produce small shot offsets.
- Stopped clock requests during ordinary gameplay once calibrated, then refresh during the finale. This keeps background clock traffic from occupying the interaction action slot; intervening device-clock drift is corrected during cinematic calibration.

The monster's detached-head and jaw death tracks are authored for its procedural rig. The installed CC0 humanoid death clip cannot directly animate that rig. See [animation and sound provenance](../assets/finale/README.md).

## Reproducing the checks

Run `npm test` and `npm run build`. With the production preview server running, set `GAME_TEST_URL` and run `test:browser:finale`, `test:browser:finale-failure`, `test:browser:coop-finale`, `test:browser:movement`, `test:browser:polish`, and `test:browser` through npm. `FINALE_TEST_RENDER_FAILURE=1` exercises the co-op renderer fallback. `VOICE_TEST_ICE_SERVERS` supplies the local TCP TURN fixture when checking the actual peer path. No additional database migration is required.

## Independent review outcome

No Critical findings. The Important mute regression is fixed and covered by the two-client browser test. One Minor presentation issue is deferred: in 3/4-player casts, the runner and first extra survivor stand close together during the last cabin hold; real skinned bounds overlap by about 3.5 cm in depth, partially obscuring that teammate. It does not hide the button press, trapped head, ascent or victory action.

The reviewer independently reran 26 focused tests and assessed state authority, objective ordering, freeze/completion, catch-up and ordinary teardown. The original frontier reviewer could not start because of an account usage limit; the replacement reviewer completed a fresh read-only review.

The reviewer declined to certify four areas beyond these checks. Decisions retained:

- Physical mobile performance: keep adaptive quality and reduced motion, with no claim of a universal frame rate. Desktop browser mobile framing was checked; slow physical devices may need Low quality.
- Audible mix quality: retain the user's monster recording, bounded gain envelopes and master volume controls. Playback/control paths were tested; subjective loudness may still merit adjustment on different speakers.
- Full operating-system suspension: retain the specified browser-host model and existing disconnect behavior. Hidden-tab progression and catch-up passed; a fully suspended host can lose its connection. Host migration remains outside this feature.
- Exhaustive GPU failures: retain tested initialization/render exceptions, cleanup and legitimate-win fallback. A browser/GPU process failure can still require reloading.
