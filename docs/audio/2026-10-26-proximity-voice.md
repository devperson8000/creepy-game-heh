# Halloween proximity voice

For the Halloween update and its password-protected tests only. Public main remains unchanged.

Use the existing encrypted WebRTC microphone streams. Each remote stream has one audible route through a mono gain and HRTF panner; its hidden compatibility audio element stays muted to prevent global voice bypass or doubled playback. No new microphone recording, upload or gameplay detection is introduced.

Speech is full volume inside 2 world metres. Beyond that, use a fifth-power falloff toward 16 metres: approximately 19% at 6 m, 6% at 8 m, 1.4% at 10 m, and zero from 16 m. Do not retain a minimum volume floor. Gain changes ramp over 60 ms and reach exact zero. Missing positions, scene handoff and connection recovery silence playback.

Rotate each source into head-relative 3D coordinates using the camera yaw and pitch; HRTF provides headphone left/right and front/back direction. The panner's built-in distance loss is disabled so the custom curve is applied once. Position automation eases over 45 ms, follows the same interpolated poses as teammate avatars, and never reconstructs the microphone stream when a player moves. Waiting room, basement, B2, spectating and finale scenes update the shared voice controller. Original microphone toggle, speaking indicators, permissions, ICE configuration and gameplay data channel remain intact. Unsupported Web Audio falls back to distance-controlled element playback.

## Verification

- Unit coverage: near/middle/far levels, monotonic falloff, camera turns, height and pitch, missing/nonfinite positions, inactive scenes.
- `scripts/check-proximity-voice-browser.mjs`: two real WebRTC peers with deterministic microphone audio, measured left/right output and camera turns, quiet middle distance, exact far silence, mute/unmute, compatibility-element muting, scene handoff, gameplay packets and cleanup. It also instantiates the actual waiting-room and co-op scene and checks their camera/player pose updates.
- The cloud browser has no local ICE candidates; verification uses a local TCP TURN fixture via `VOICE_TEST_ICE_SERVERS`. This is test configuration only; production ICE settings are unchanged.
- Full project test suite and production build before deployment.
