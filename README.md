# MONOCHROME — browser escape game

A first-person monochrome horror escape game built with Three.js and Vite. Uses the creature developed in this repository and the documented escape loop from [monochromegame.wiki](https://monochromegame.wiki/walkthrough/).

## Play

Open the boarded **DO NOT ENTER** doorway in the elevator lobby. Descend the return stairs, search dresser drawers for **four keys**, and read the **four-digit note** in the basement. Hide in closets when the moving creature approaches. Return upstairs, bank the keys at the four-lock panel, enter the number at the separate keypad, then open the elevator and walk inside.

Key locations, basement corridors, and the four-digit number vary between runs. Banked keys and an accepted code survive a retry. Unbanked keys return to their original drawers when you are caught. The clue is recorded in the HUD after you read it. Leaving a searched drawer open helps track progress.

- **WASD / arrow keys:** move.
- **Mouse:** look; click the scene to capture it.
- **Shift:** run.
- **Hold E:** interact, search, collect, bank keys, or hide/leave a closet.
- **Escape:** pause or close the keypad.
- On touch devices, drag to look, use the arrow pad to move, and hold the interaction button.

The original creature animation viewer remains available through **Creature study** on the title screen, or `?mode=study`. There, the button or **R** toggles running in place.

## Difficulty and atmosphere

The creature sees farther, investigates nearby footsteps and noisy interactions, and pursues faster than your sprint. Walking has a shorter hearing range than sprinting; drawers and closet doors make noise. Walls soften sounds. Noise draws the creature to the sound’s last location, not a hidden player’s current position. Break sight and hide before it sees you enter. Standing still is quiet, and the HUD reports your recent noise level. Muting playback does not disable its hearing.

Both actors collide with walls and furniture. The creature uses a finer obstacle-aware route and swept collision checks, with extra wall clearance for its wide head. The basement has worn surfaces, ceiling pipes, drifting dust, and local footstep/interaction sounds.

Ceiling fixtures in rooms and corridors act as a proximity warning. Beyond 16 units they stay steady at full brightness. As the creature approaches, each fixture independently dims and produces randomly timed electrical glitches and bursts. Within 4.5 units, or during a local hunt, the nearby lights die completely. The player's immediate area also blacks out during a hunt; ambient light, camera fill, luminous surfaces, and fog cannot reveal the room. HUD controls remain usable. Power returns smoothly when the creature leaves or the hunt ends, with fresh warning patterns on each approach. Upstairs stays unaffected by a basement hunt. Lighting freezes while paused.

## Monster sound

The full audio from the user-uploaded `roblox monochrome sound effect --- Prank.mp4` is extracted to `public/audio/monster.mp3` (about two minutes) and loops during gameplay. No video is bundled. The supplied sound comes from the [referenced Short](https://www.youtube.com/shorts/3YKcnvUfKlY).

Sound is completely silent at 32 units or farther, progressively louder inside that range, capped at 85% gain within 1.5 units, with a gentle power curve and smooth volume changes. It remains audible nearby while hiding and silences during menus, pause, death, and escape. Playback unlocks from the Enter/Continue gesture on desktop and mobile. Use **M** or the **Sound on/off** button to mute.

The wiki mentions footsteps and light warnings but does not verify an exact attenuation radius; these distances implement the requested behavior.

## Reference boundaries

The wiki documents the boarded doorway, upstairs elevator hub, stairs, basement furniture searches, closets, four keys, a run-specific four-digit clue, and two separate elevator lock systems. See [route map](https://monochromegame.wiki/route-map/), [keys](https://monochromegame.wiki/keys-and-code/), and [code](https://monochromegame.wiki/code/). These pages were read on October 14, 2026.

The wiki explicitly does not confirm an exact basement floor plan, fixed key spawns, current-build control bindings, or detailed monster AI. This browser version supplies its own connected maze, collision, patrol/chase behavior, visual danger cues, controls, menus, and retry system around the documented route. It does not claim to reproduce unverified Roblox internals or Part 2. All scene assets are locally generated; no external asset service or account is required.

## Development

Node.js 22.12+ or 24 recommended.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

In a restricted cloud workspace, use `npm ci --cache /tmp/creepy-npm-cache` if the default npm cache is not writable. Use the existing checkout; no extra worktree is needed. A WebGL-capable browser is required.

## Vercel

Import `devperson8000/creepy-game-heh` from GitHub into Vercel. Select the **Vite** preset, build with `npm run build`, output **dist**, production branch **main**. The included `vercel.json` supplies the build settings. Subsequent pushes trigger deployment once the GitHub integration is connected. No backend or secrets are needed.
