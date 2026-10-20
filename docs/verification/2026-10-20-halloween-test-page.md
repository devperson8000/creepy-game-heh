# Password-protected Halloween test page

The Singleplayer/Multiplayer menu now has **Test Halloween Gameplay**. Its password dialog verifies access through a POST-only, uncached server endpoint. The assigned password is represented by a server-only SHA-256 verifier, and is not included in the browser bundle, URLs or browser storage. Access lasts until the test page is closed or reloaded. Every embedded test verifies access again; a standalone test-frame URL does not start a test.

After unlocking, the page offers:

- Full Halloween gameplay with the normal quest, clock and arrival.
- Play with friends: a host can create a Halloween co-op session before release. Ordinary guests receive the same seasonal layout through the existing authenticated host snapshot.
- Decorated map: cycle through rooms with the hunt paused for inspection.
- Quest items: jump straight to the invitation, each seal or the chest, with the preceding quest steps supplied. Interactions still use the real hold-E behavior.
- Halloween key reveal: pre-supply the three seals and immediately run the actual chest-opening and floating-key reveal. No searching required.
- B2 encounter: pre-grant the Halloween Key, play the real descent and automatically approach the stranger to begin the dialogue, teaser and disappearance.
- Monochrome II teaser: play the recovered footage immediately.
- Return elevator: begin the real return sequence with the key granted and the B1 pose preserved.

Each scenario supports Replay test and Back to tests. A separate game frame isolates input handlers, rendering, sound and network connections when switching tests. Returning from a co-op test closes the host session. Test arrivals leave the mouse free until the tester clicks the game canvas, so completing the intro cannot unexpectedly capture the test-page navigation. Normal menu entries and the October 31 release gate remain unchanged by testing. The selected Hooded Wanderer source asset remains unavailable, and the page identifies the temporary B2 figure.

Verification:

- `npm test`: 248 passing tests. Added endpoint tests for valid/invalid/empty/malformed passwords, uncached responses and rejected GET access, plus tests for key-only grants, actual B2/return transitions, quest shortcuts and room inspection.
- `npm run build`: passes. Existing chunk-size advisory remains.
- Built production browser flow passes wrong-password rejection, successful unlock, desktop/390px/320px layouts, immediate real chest/lid/key animation, replay, quest shortcuts, B2 auto-approach, return elevator, decorated-room cycling, full gameplay, teaser, frame disposal and return to a normal pre-release run.
- Two real authenticated players pass: a password-authorized test host starts the seasonal map early, a guest from the ordinary menu receives the matching layout, and leaving the test closes the session.
- Production release boundary checks pass: a future device clock or preview query does not unlock normal runs; the trusted deadline still does.
- Release menu lifecycle checks pass, including phone layout, old debug URLs, multiplayer/back and solo/pause/return, with exactly the newly requested password-gated test entry.
- Desktop/menu/test-page and phone screenshots reviewed. The assigned password is absent from browser sources and compiled browser assets.

Browser checks can receive `HALLOWEEN_TEST_PASSWORD` from the local environment; the access password is not committed in test fixtures.
