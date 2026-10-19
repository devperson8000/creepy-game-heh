# Slightly slower finale and shared mouth

The finale now lasts **30 seconds**, easing the previous 27-second cut by about 10%. Every beat, animation, camera, audio event and authoritative completion follows the same retiming, preserving their relative timing. The trapped-head interval is still brief, approximately 3.7 seconds.

The monster uses the exact existing `/images/jumpscare-mouth.png` texture. Jumpscare and finale share the transparent mouth geometry/material factory. The finale animates its opening during the door struggle and settles it after death. The old procedural teeth and mouth cavity are removed. The cutout stays hidden until decoded, preventing a white rectangle. Actor disposal preserves the borrowed texture across cast changes; the presenter disposes its owned texture when leaving.

Verification:

- 198 Node tests passed, including jumpscare regressions, matching mouth texture/geometry, readiness, texture ownership, 30-second completion and timing synchronization.
- Production build passed, with the existing Three.js chunk-size advisory.
- Desktop and portrait trapped-head renders were inspected; chase, ascent and fallen-head renders were also captured. The same red-and-white mouth is visible on the finale head.
- Full real 30-second production preview passed: image URL/readiness, winning titles, replay, 2/3/4 casts, mute, mobile layout, Escape, repeated menu returns and model-download failure/retry, without runtime errors.

- Two authenticated co-op clients passed the actual victory trigger, HUD hiding, mute controls, synchronized playback, hidden-host progression, large-seek catch-up and final victory. Sample clocks: 2.070 / 2.015 seconds. Network assertions retain actual state and transport while disabling GPU drawing after startup.

Reproduce with `npm test`, `npm run build`, `npm run test:browser:finale` and `npm run test:browser:coop-finale`, with `GAME_TEST_URL` pointing to the running server.
