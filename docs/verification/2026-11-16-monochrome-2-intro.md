# MONOCHROME 2 — cinematic intro

The dedicated /monochrome2 route plays an 80-second Three.js cinematic. It is separate from the playable /backrooms route and uses the same Level Zero world implementation for the final reveal.

## Story beats
1. Three hazmat survivors are already outside, walking together after their escape. They discuss how they got out of the basement, the stairs, and the closing door.
2. They head to a street-side supply store for food and drinks. The two friends split off, reach up to collect supplies, and then the lead continues toward the service ramp.
3. The lead descends the ramp in a clear rear tracking shot. A narrow hairline seam runs from the top to the bottom of the wall.
4. At the wall, the lead turns his head to listen. The camera cuts closer as he reaches out with one hand and leans against the wall.
5. His weight carries him through the wall. The camera follows him down to the carpet, then lifts and pulls back as he stands inside the existing Level Zero map.
6. The view fades to black. “MONOCHROME 2” appears first, followed by “IN THE BACKROOMS” below it.

## Presentation
- Three instances of the same hazmat survivor rig with distinct dialogue identities and browser speech-voice selection where available. Character-specific pitch and pace remain distinct when the browser offers fewer voices.
- Walk-cycle timing is driven by measured root travel. The camera keeps the ramp unobstructed and stays inside the existing Level Zero ceiling during the final overhead reveal.
- The wall crack is a thin, full-height line, visible through the listening and hand-reach sequence, then fading at contact. The ramp wall fades away during the fall-through so the crossing remains continuous.
- The ending reuses the actual Backrooms Level Zero world, including its wallpaper, ceiling grid, lighting, and authored room layout.
- Browser speech synthesis is used for dialogue; available voices vary by browser and operating system. Captions remain available if speech synthesis is unavailable. Start remains user-initiated to unlock audio; replay and sound controls are included.

## Verification
Timeline behaviour is covered by tests/monochrome2-intro.test.js. The cinematic remains isolated from Backrooms gameplay, multiplayer, objectives, and encounter logic.
