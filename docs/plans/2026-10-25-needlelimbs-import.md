# Supplied Needlelimbs integration

Scope: staged Halloween content only. Keep the public map-only production branch unchanged.

Use the uploaded Needle.fbx skin and animation in the existing approved teaser: a walking approach during the survivor reply, a planted stop, independent neck/head peek, then mechanical Monochrome. Shared teaser playback covers B2's monitor, replay, and tests. Do not introduce Needlelimbs as a basement enemy.

Implementation: Blender converts the supplied FBX to a 746 KB GLB. Source metarig spine.006/spine.005 become Head/Neck. Source animation is explicitly named Needlelimbs_Walk; retain actual limb and torso tracks, remove horizontal root drift, ease legs into their imported planted stance, and refresh skinned bounds to ground the feet. Reset action bindings before absolute sampling to prevent accumulated offsets during replay/seek.

Texture follow-up: textures.docx successfully supplied all three maps at 1380px. Extract the original embedded media, embed base color with sRGB and roughness with linear sampling, derive a subtle normal from height for glTF compatibility, and verify real browser decoding. Source maps and reconstruction notes live in scripts/assets/needlelimbs/. Preserve source attribution.

Verification: source-asset tests check skeletal articulation, floor grounding, independent head motion, and deterministic seeks. Browser verification checks the actual current recap/teaser, model loading, screenshots, absence of retired creature requests, and clean disposal. Run the staged branch's full test suite and build before committing.

## Corner/framing refinement

The deployed tester used the shared B2 camera's width-only monitor fit; a 1280×443 embedded viewport projected the screen's vertical corners to ±1.596, cropping the film. Fit both viewport axes, including bezel and overlay clearance, and place the sound control in the top letterbox. The same b2Frame and createHalloweenExperience code serves B2 gameplay and test replay.

Needlelimbs now advances only 1.9m and keeps its root at least 4.25m behind the corridor reference instead of walking to 2.65m. It settles its source gait, leans from its upper spine, turns neck/head, holds a short glimpse, then withdraws behind cover before mechanical Monochrome arrives. Source animation, material, and absolute-time playback remain shared across tester and gameplay.

Verified with 340 unit tests, a successful build, real teaser rendering, and the real password-protected B2 test at desktop, short ultrawide, portrait, and fullscreen sizes. No release content is merged into the public map branch.
