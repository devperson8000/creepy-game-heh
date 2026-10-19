# Reliable hold-E drawers

## Behavior

Drawer search holds complete in 0.3 seconds, followed by faster frame-rate-independent opening. Fixed interaction surfaces cover each drawer slot, so cabinet trim and already-open drawers do not intercept lower drawer selection. Small movements within the same cabinet retain the drawer selected at the start of the E hold. Actual moving drawer geometry remains rendered and continues to participate in ordinary world sight checks; invisible interaction surfaces do not block monster sight or rescue visibility.

Nearby co-op drawer actions bypass the cabinet obstruction test. Drawer proximity allows 3.2 meters at the host to accommodate the extended drawer and movement delivery differences; other interaction ranges/visibility rules retain their existing behavior. All drawer action failures are silent.

Remote players preview opening, closing and key disappearance immediately. One ordered queue retries requests every 350 ms until a host snapshot acknowledges them, including when the shared action channel refuses a send. The queue reapplies pending previews after older snapshots to prevent visible snapping. Explicit open/close/key intents and a bounded host replay cache prevent repeated or delayed packets from toggling the drawer or duplicating a key. Only the host grants inventory. This uses the existing authenticated action and snapshot formats and needs no database migration.

## Verification

- `npm test`: all 230 tests pass. Coverage includes blocked cabinet acceptance, quiet failures, replay safety, cabinet trim targeting, aim stability, busy-channel retry, stale snapshots, rapid ordered open/close and key preview without fabricated inventory.
- `npm run build`: passed; the existing Three.js chunk-size advisory remains.
- Real solo browser/input check: all 36 drawers open with actual E holds, top-to-bottom, while earlier drawers stay open. Repeat with `npm run test:browser:drawers`.
- `npm run test:browser:coop-drawers`: passed with two authenticated clients and database transport. The fixture refuses two drawer sends, adds 600 ms delivery delay, and forces the host cabinet-visibility check to return false. The guest opens the drawer before the host receives it; snapshots cannot snap it shut; automatic retries reach the host without a second E hold. Continuing to hold E does not close it or take a key. A separate hold collects the key exactly once, and another closes the drawer. No drawer error toasts or runtime page errors occur.
- `npm run test:browser:coop-rescue`: passed. Actual front/back cabinet actions succeed, the 45-second rescue deadline reaches the guest, the revive marker fills and resets on E, and a late rescue succeeds on both clients. The prior expectation that an occluded drawer remain blocked was updated to the requested behavior.
