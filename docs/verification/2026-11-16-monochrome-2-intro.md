# MONOCHROME 2: IN THE BACKROOMS — release intro

The dedicated /monochrome2 route plays a 66-second, in-engine Three.js cinematic. It is separate from both the original Monochrome game and the playable /backrooms route.

## Story beats
1. Three hazmat survivors exit the elevator they escaped through at the end of Monochrome.
2. They cross a quiet street and grassy verges before finding the Northway Supply store.
3. The two friends split off to collect food and drinks while the lead notices a narrow, warm slit of light at the bottom of a staff ramp.
4. The slit vanishes. The lead approaches the wall, listens, reaches out, and slips through it.
5. The lead wakes on the yellow carpet of Level 0, rises as the camera moves behind and above, and the title appears: **MONOCHROME 2: IN THE BACKROOMS**.

## Presentation
- Three independent instances of the existing CC0 hazmat survivor rig, using its baked Idle and Walk animations and per-survivor numbering. Walk-cycle time is driven by measured character travel distance so foot motion stays in step with the slower root movement.
- Procedural street, convenience-store interior, descending service ramp, a tiny emissive wall seam that remains visible until the lead reaches it, and a continuous step onto the lower yellow Level 0 carpet. Props sit on their shelves and surfaces rather than hovering.
- Camera choreography, environmental lighting, restrained film grain, generated ambient sound/effects, and captions.
- Dialogue uses the browser's native speech synthesis voices. Voice quality and voice availability depend on the user's browser and operating system; captions remain available when speech synthesis is unavailable.
- Start is user-initiated so the browser can unlock audio. Replay and sound controls are included.

## Route and verification
Open /monochrome2 on the deployed site. Timeline logic is covered by tests/monochrome2-intro.test.js. The intro does not change the Backrooms world, multiplayer, objectives, encounter slot, or original game systems.
