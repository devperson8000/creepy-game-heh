# Needlelimbs teaser and pre-menu introduction preparation

User direction: choose Loco's Needlelimbs; replace the three-monster edit with one naturally animated creature. Radio: “You made it out?” Survivor: “Yes, but I don’t think it was just Monochrome…” During the reply Needlelimbs approaches a corner and peeks. Cut to the original Monochrome walking up behind it, using his existing sound and a mechanical replacement head following the elevator finale. Remove the recovered-tape menu entry. Prepare an introduction slot before the singleplayer/multiplayer screen. User explicitly requested implementation without another approval step.

## What is active

- The password-protected **Monochrome II teaser** case now plays the revised cutscene and audio. This work-in-progress preview explicitly omits the unavailable Needlelimbs model and displays a notice. Normal gameplay still uses the earlier complete film.

- The unlocked “Recovered footage / Tape 02” menu button has been removed, including for returning players with the old localStorage flag. The password-protected Halloween test hub is preserved.
- Normal startup passes through a prepared intro slot. No unwritten film delays the mode menu. Test frames, direct multiplayer testing and the existing in-game B1 arrival are preserved.

## Staged replacement film

Duration remains 25 seconds, preserving the shared host clock and the existing 43-second B2 conversation.

- 0–4: hazmat survivor exits the elevator; radio asks the question.
- 4–9.6: survivor reply. Needlelimbs follows its actual skeletal walking clip along a continuous path toward the right-hand corridor corner; it slows into the peek, turns its head and neck, and keeps the rest of its body behind actual walls.
- 12–17: cut into the branch; Monochrome walks up behind Needlelimbs. Original monster recording starts at 12.5 seconds.
- 16.5–20.65: closer camera angle makes the replacement steel head, segmented horns, bolts, jaw hinges and repaired neck readable.
- 20.65–21: black cut.
- 21–25: Monochrome II title. No extra recovered-footage title is added to this edit.

New modules: `needlelimbs-timeline.js`, `needlelimbs-actor.js`, `needlelimbs-scene.js`, `mechanical-head.js`. Audio scheduling accepts the edition's voice and sound cue lists and loads the recorded survivor reply. It retains mute, visibility, audio-unlock and disposal behavior.

`teaser-edition.js` keeps `NEEDLELIMBS_READY=false`. Both picture and sound switch together when the reviewed source is ready. The old public edit remains working while the selected file is missing. The private tester explicitly chooses the new picture, sound and subtitle timeline together through `teaser-playback.js`. Its preview-only missing-model option still loads the real hazmat character, shows the mechanical Monochrome reveal and never substitutes another creature. No other model is presented as Needlelimbs.

## Exact source dependency

Selected listing: https://sketchfab.com/3d-models/backrooms-entity-38-needlelimbs-6e8ad10cbcbb49bda63a1b21a660533d

Creator: Loco. Listing license: CC BY 4.0. Official metadata reports 14,539 triangles and 2 animations. Rechecked 2026-10-21: official `/v3/models/6e8ad10cbcbb49bda63a1b21a660533d/download` returns HTTP 401. Publicly visible previews and metadata do not provide a usable source file. No authenticated Sketchfab connection is configured, and no creator-authorized alternate download was found.

Required next input: the signed-in download of this exact model, preferably GLB with animations, or its FBX/Blender archive and textures. Import target: `public/models/teaser/needlelimbs.glb`. Preserve the source credit and license. Inspect orientation, native walk/idle clips, head and neck bone names, scale, ground contact and head clearance in the actual corridor. Adapt the generic actor adapter to those findings, then watch the full film and co-op encounter before setting `NEEDLELIMBS_READY=true`.

The generic adapter has synthetic-rig tests for animation, root drift, independent source skeletons and deterministic peek sampling. Those tests do not establish that the unavailable source rig has been inspected or that its natural gait has been verified.

## Monochrome I intro slot

`opening-sequence.js` prepares the pre-menu lifecycle: one menu handoff, skip by button/Space/Escape, pause while hidden, reduced-motion timing and cleanup. `opening-film.js` intentionally exports no film factory yet; the request was to get ready for this animation, not invent its final story.

Proposed authoring space: a short B1 introduction ending on the Monochrome title before handing off to the existing mode menu. The I introduction must not use the repaired sequel head or reveal Needlelimbs. Future film rendering/audio belongs in the factory; intro lifecycle and mode selection already have a connection point.
