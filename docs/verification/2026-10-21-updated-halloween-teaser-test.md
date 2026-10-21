# Updated teaser in the Halloween tester

The password-protected **Test Halloween Gameplay → Monochrome II teaser** case now selects the revised cutscene. It includes the original hazmat survivor, “You made it out?”, the new survivor reply, the corridor edit, mechanical Monochrome walking into the reveal, the stronger metallic version of his original sound and the Monochrome II title.

The actual Needlelimbs source is still unavailable. This private work-in-progress preview explicitly omits that actor and displays a persistent notice. It does not load the previous three creatures, replace Needlelimbs with another model or repeatedly request a missing GLB. The normal B2 film remains the previous complete edit until the selected source is imported and verified.

`teaser-playback.js` selects the matching scene, voice cues, sound cues and subtitle sampler as one edition. The preview option is selected only after password authorization, for the teaser test frame. The required hazmat asset still reports a genuine load failure. The missing-model option is explicit and is not enabled by default on the new scene loader.

Validation:

- `npm test`: 262 passing tests.
- `npm run build`: passes with the existing bundle-size warning.
- `node scripts/check-halloween-updated-teaser-browser.mjs`: exercises the password entry, new dialogue, source requests, explicit missing-model notice, full playback, replay and teardown. Captures the actual mechanical reveal in `work/updated-teaser/mechanical-reveal.png`.
- `npm run test:browser:teaser`: checks the normal B2 film and outro, plus private replay, mute, mobile layout, asset-failure handling and cleanup. Its failure case now blocks the required hazmat asset, because the private preview no longer requests the old maw model.

The final walking/peeking animation for the chosen Needlelimbs model remains blocked by its authenticated source download. This tester update does not claim that the unavailable model is present or animated.

The visual check found the branch return wall blocking the wide mechanical reveal. The camera now sits within the open corridor for both the approach and closer shot; the final tester capture visibly shows the repaired face, horns, jaw and neck. The hazmat character also faces the direction of its exit walk. An initial concurrent software-rendered regression run missed a short legacy glimpse; the complete regression passed when run sequentially. Screenshot capture uses a clipped page image to avoid iframe auto-scroll delaying the capture into the title or after teardown.
