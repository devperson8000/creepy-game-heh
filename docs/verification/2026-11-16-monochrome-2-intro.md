# MONOCHROME 2 — cinematic intro

The dedicated /monochrome2 route plays a 78-second Three.js cinematic. It is separate from the playable /backrooms route.

## Story beats
1. Three survivors are already outside, walking to a small supply store after escaping Monochrome.
2. The friends collect food and water. The street is built from non-overlapping ground bands to prevent coplanar flicker.
3. The lead walks down a twelve-step stairway to a wall. A very thin hairline crack is visible only when he is close enough to inspect it.
4. The lead listens, reaches out and leans on the wall. The camera tracks his upper-spine/head joint as he and the camera pass through together.
5. He immediately falls onto the actual Level Zero floor mesh used by the playable Backrooms map. The camera pans out, then stays low beneath the real ceiling while he slowly gets up.
6. He crouches slightly and cautiously scans the room. The actual game's Monochrome creature runs across a distant opening as a black silhouette, with no creature cue or monster sound.
7. The Backrooms ambience fades away as the frame goes black. “MONOCHROME 2” appears first, followed by “IN THE BACKROOMS”.

## Presentation
- Character subtitles are driven by SpeechSynthesisUtterance onstart/onend events, so the visible caption follows the actual browser voice duration rather than guessed cue windows. When voice playback is unavailable or muted, a timed caption fallback remains.
- The stair actor path follows the visible stair elevations and remains grounded.
- The wall crack is distance-gated and disappears at contact.
- The final Backrooms floor, walls, ceiling grid, wallpaper and lighting are taken from createBackroomsWorld, not approximated with a separate intro room.
- Existing /audio/halloween/sfx/room-dread.mp3 supplies quiet Backrooms ambience. The Monochrome cameo is intentionally silent.
- The camera stays under the Level Zero ceiling after entry. Multiplayer, gameplay collision and objectives are untouched.

## Verification
The focused behaviour is covered by tests/monochrome2-intro.test.js. The visual pass should include the street, stairs, wall crossing, fall, cautious scan, distant silhouette and title.
