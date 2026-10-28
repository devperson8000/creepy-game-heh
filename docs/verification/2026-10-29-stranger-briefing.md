# Stranger-hosted launch film and private preview verification

The launch film uses the actual B2 hooded stranger GLB and his existing synthetic `bm_george` voice. All12 dialogue cues were regenerated with the B2 voice mastering, measured decoded durations, and nonoverlapping slots. The original music AAC is unchanged (SHA256 `2c0b7c89d70c5143774f997ff7352b12ac09421d4ef7c3885281d2f5abada073`). Static begins94s; music96.25s; original three accent times remain exact.

The stranger hosts the table opening, returns for dry asides, looks toward the darkening corridor and reacts before static. Rigged head/hand gestures use absolute-time envelopes. Cold rim lighting keeps the black hood readable; table decoration was moved to reveal his gestures. Survivor gait rate now matches their slow travel (0.833s source walk cycle sampled at0.42×, instead of0.2×). Smooth light shutoffs, restrained cut mattes, closer portrait framing, an asset-readiness bound, and repeated-frame render avoidance complete the visual polish. Reduced motion holds each shot still.

Private tests add **Countdown launch sequence** and **Stranger launch briefing** after the existing server password check. Shortcuts preview the final5min/1min/30s/10s, full film, static/music and titles. The actual shared countdown receives an isolated clock/session store and finish callback; it never mutates the global release gate. Native fullscreen requires choosing its control; entering the preview preserves the hub controls. Main has no preview adapter, test routes or seasonal gameplay additions.

Evidence:
- Main isolated `npm test`:315/315 pass; focused director/narrator/scene/audio/gate/timeline:27/27.
- Private `node --test tests/*.test.js`:396/396 pass.
- Both production builds pass; existing main/Three chunk-size advisories remain. Launch film remains lazy.
- Scene browser: desktop/phone/ultrawide, actual imported narrator, deterministic reduced motion, missing and late narrator/avatar models, disposal and shared source preservation pass. Representative shots inspected.
- Player browser: actual BufferSource→title mutation deltas9/9/9ms; static→silent black→score, hidden clock pause, four viewports, missing audio/WebGL, skip/proceed cleanup pass.
- Countdown browser: gate/once-only zero/replay, fullscreen and footer clearance, focus, mute, hidden crossing/unknown clock, gameplay teardown pass.
- Authenticated private browser: password gate, real final countdown→same film, direct preview, static/music/title shortcuts, replay and back cleanup pass.
- Shared-file sync check:39 launch-only modules/media/tests have identical hashes in main and tester. Existing creature/avatar dependencies and underlying media also match, independently reviewed.
- Independent review found no actionable blockers and independently ran21 tests.

The prior gait test compared two near-equivalent points of the new walk cycle. It now asserts articulation across seven samples, retaining its original angular threshold and seek reproducibility. The hidden-pause browser check now waits for a resumed source rather than requiring a nonzero time advance within one audio quantum.
