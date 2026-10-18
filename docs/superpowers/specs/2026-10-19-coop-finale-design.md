# Monochrome co-op finale

Status: written design for review; cinematic implementation has not started.

## Goal and delivery order

Make a successful multiplayer escape feel like the climax of the game: a desperate chase, a narrow rescue, Monochrome trapped in the elevator doors, a violent final reversal, then a quiet team victory.

The existing menu, visual polish, settings, and multiplayer movement fixes were pushed to `main` first, in commit `36de932fca883bfe2c4ac93734bff6164185cfa3`. The finale is a separate change.

## The approved sequence

Target duration: 52 seconds. Use the game's actual hazmat characters and Monochrome model, rendered in real time.

| Time | Picture and sound |
| --- | --- |
| 0–2 s | Fade the game to black. Running footsteps and breath begin; Monochrome's sound rises behind them. |
| 2–12 s | Reveal a low tracking shot of the last survivor sprinting through the basement, Monochrome close behind. Show the distance closing. |
| 12–19 s | Cut toward the return stairs. The other survivors wait inside the elevator. The runner climbs the stairs with the creature reaching after them. |
| 19–23 s | The runner dives through the doorway. A clear close-up shows another survivor's gloved hand physically pressing CLOSE DOORS. |
| 23–30 s | The doors clamp around Monochrome's neck. Its head protrudes into the cab, mouth open and snapping, accompanied by its loud scream. The doors visibly strain. |
| 30–35 s | The elevator jolts upward. Shaft lights pass downward through the remaining gap, the floor indicator changes, and the survivors brace. The trapped head stays aligned with the cab while the body remains outside. |
| 35–39 s | A fixed shaft frame meets the rising elevator and severs the neck. The head drops, bounces, and settles on the cab floor. Thick black blood starts pooling beneath it. |
| 39–44 s | The mouth and head twitch briefly and go still; the scream breaks off. Hold the silence, then lift the camera toward the survivors and fade to black. |
| 44–52 s | The elevator opens into pale daylight. The surviving teammates walk out together. Display **YOU ESCAPED.** followed by **TOGETHER.** |

The chase is fast; the trapped-head moment has a deliberate pause so the threat and the elevator's movement are readable. The neck cut must have a visible mechanical cause. Use black blood and the creature's existing silhouette.

## Trigger and cast

- This sequence applies to multiplayer rounds that began with at least two players. Singleplayer keeps its existing ending.
- The host starts the finale once all four keys are banked and the correct code is accepted, whichever requirement is completed last. There is no additional elevator interaction required in this mode.
- Start it exactly once. Freeze gameplay movement, enemy attacks, downed timers, and interactions for the duration. Do not let normal victory or death overlays interrupt it.
- Exclude dead and disconnected teammates from the cast. Downed players count as rescued and appear in the cab if another living player completes the objective.
- Choose the living survivor farthest from the elevator as the runner. Choose the other cast member with the lowest team slot as the button presser. Additional cast members wait inside the cab. Fix those roles in the shared cinematic state.
- If only one survivor remains in the cast, use that survivor as runner and show their own hand hitting the button after the dive. The sequence still belongs to the original multiplayer round; it does not resurrect missing teammates.
- The epilogue shows the same rescued cast. Game statistics and fallen-player results remain accurate.

## Test animation button

Add a visible **Test finale animation** control to the main menu, alongside the existing creature study and co-op test links. It opens a standalone preview of this exact cinematic with two demonstration survivors and no lobby connection or completed-round requirement.

Provide **Replay** and **Back to menu** controls, plus Escape to return. Include a 2/3/4-player cast selector in the preview controls so all supported team sizes can be checked. The button click permits audio playback. The preview must not update a real lobby, save a victory, or alter progress. Returning restores the menu and its atmosphere without leaving audio, render loops, or handlers running.

## Playback and multiplayer behavior

Use a separate cinematic scene and camera controller, sharing the existing creature, avatar asset, preferences, and renderer where practical. A purpose-built basement/stair/elevator set gives the cameras consistent sightlines without relying on the randomly generated level layout. Keep the elevator and materials visually consistent with gameplay.

The host publishes one cinematic record through the existing authoritative snapshot channel: unique run/cinematic ID, start time, fixed cast/roles, duration, and phase. Clients derive the shot and animation pose from a shared elapsed time. Do not stream character positions for this scripted sequence. Continue sending timing snapshots over the existing peer channel and database fallback. Correct clock drift gently; do not replay old screams or effects after receiving late snapshots.

The cinematic clock advances even if the host tab is hidden. Returning to a visible tab catches up to the current shot. A disconnected viewer can return to the current phase while the session remains valid. The existing host-disconnect behavior remains in effect; this change does not introduce host migration.

At completion, the host records the successful outcome once. Every client shows the final title and ordinary return/retry actions after the epilogue. Preview mode uses the same timeline with a local clock and no network writes.

## Animation, sound, and presentation

Reuse the actual survivor run and walk clips. Add explicit poses for the dive, button press, and bracing so these actions are visibly performed by characters. Monochrome needs an articulated mouth for the trapped-head shot, a clean head detachment, and authored head/jaw death motion.

Investigate reusable death-animation assets from the web during implementation, recording their source, license, and rig compatibility. The existing Monochrome model is procedural and has no standard humanoid skeleton, so a downloaded body-death clip may require adaptation. If no suitable clip can drive its head and jaw, author those tracks directly and document that choice instead of claiming an incompatible clip was used.

Layer panting, footsteps, the existing monster sound, door impacts, strained machinery, the ascent, and the head's impact. The monster should dominate the chase and trapped-head moment, then leave a distinct silence. All audio respects saved mute and volume settings. Reduced-motion mode retains the story and duration while removing camera shake and abrupt motion effects. Avoid repeated bright flashes.

Use smooth camera easing, consistent framing, readable character silhouettes, and restrained motion blur only if it performs well. On mobile and lower graphics settings, reduce shadows and effects without removing story beats or hiding the button press, trapped head, ascent, or final exit.

## Failure handling and resource ownership

Preload shared character assets before a multiplayer round can reach the finale. If optional sound or animation downloads fail, retain the complete sequence with existing audio and authored motion. If a required cinematic scene cannot initialize, show the legitimate co-op victory screen with an explicit preview error in standalone test mode; do not leave players on a black screen.

Dispose cinematic geometry, cloned materials, animation mixers, audio, timers, and event listeners when leaving or replaying. Keep shared cached avatar assets usable by the menu and next round.

## Acceptance checks

- Unit tests cover objective-order independence, a single host trigger, cast selection, gameplay freeze, snapshot/timing serialization, late-snapshot catch-up, and one final win transition.
- Real two-client browser checks cover synchronized start, peer and database transport, hidden-tab catch-up, and normal exit to the menu. Confirm that movement fixes remain working after the cinematic change.
- Preview the full 52-second sequence and inspect every major shot: pursuit, stairs, dive, actual button press, trapped neck, visible ascent, mechanical severing, black blood, death motion, and the daylight team exit.
- Check preview replay, leaving mid-sequence, 2/3/4-player casts, muted audio, reduced motion, narrow screens, and no runtime errors or accumulating render/audio loops.
- Run the full test suite and production build before reporting completion. Record asset provenance and the browser verification results.
