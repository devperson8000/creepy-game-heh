# Microphone hearing in the current game

The user approved volume-based microphone hearing, with screams louder than sprinting and sprinting plus screaming provoking direct pursuit. This is a main-game change, independent of Halloween and Monochrome II.

Use the existing enabled voice-chat microphone. Measure loudness locally; do not record, transcribe, or upload audio for AI. The host receives bounded loudness levels through authenticated movement inputs and derives sound positions from authoritative players. Keep existing movement, stamina, map, objective, rescue, sound controls, and monster chase speeds.

The chosen approach extends the existing hearing system. A speaking/not-speaking trigger would punish quiet conversation as much as screams. Tracking someone globally after any speech would remove the escape counterplay. Neither is appropriate.

## Proposed tuning

- Quiet speech: noise radius 5; conversation: 12; shouting: 24; screaming: 36; screaming while actually sprinting: 44 world units. Existing sprint radius is 17. Existing wall attenuation remains.
- A sustained scream is urgent: immediately pursue the last heard point at existing chase speed, including during ordinary roaming. Fresh sound updates that point. Silence and broken sight permit the existing search/roam transition; sound never supplies unseen future positions.
- A closet multiplies voice radius by .35 and emits at its real entrance. If actually heard, that entrance becomes known, using the existing witnessed-closet/capture rules. Silent closets remain safe unless entry was seen.
- Voice analysis rejects DC, tiny background noise, non-finite input and brief spikes; approximately 150–200 ms of sustained loudness is required. Sensitivity is adjustable and saved; no automatic gain control that turns whispers into screams.
- Muting immediately reports silence; stale or reordered microphone reports expire, with no audio emitted from old movement replay. Downed, escaped and disconnected players cannot lure the monster. Waiting rooms, arrival and finale do not emit gameplay microphone noise; the safe clock remains safe. A living player talking in the co-op pause menu still makes sound because the world continues.
- Show a small local microphone meter and quiet/talking/loud/screaming labels. Avoid sound effects for microphone events: teammates already hear the actual voice.

## Protocol compatibility

Extend game_send_input to optionally accept voiceLevel (integer 0–4) and voiceSequence (positive safe integer), as a pair, on the packet only. Preserve seven-field legacy inputs and nine-field movement replay inputs, their rate limits, authenticated identity, command bounds and privileges. New replay commands remain nine fields. No movement/action channel is repurposed.

## Verification

Test the real loudness detector, sound radii, host simulation, wall/closet attenuation, urgent last-heard pursuit, silence escape, lifecycle, ordering, movement replay and legacy compatibility. Browser-check a real captured deterministic microphone through voice chat and two authenticated clients; exercise mute, intensity, drawers and movement. Build and run the full main-game suite; verify the deployed main keeps seasonal content excluded.
