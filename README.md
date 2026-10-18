# MONOCHROME — browser escape game

A first-person monochrome horror escape game built with Three.js and Vite. Uses the creature developed in this repository and the documented escape loop from [monochromegame.wiki](https://monochromegame.wiki/walkthrough/).

## Modes and co-op

The opening screen offers **Singleplayer** and **Multiplayer**. Multiplayer uses Supabase anonymous authentication, owner-approved named lobbies and a maximum of four players. The host starts once two to four members are ready. The selected player model is the **curved yellow hazmat survivor**, with numbered patches, teammate names and a visible handheld torch. First-person hands wear matching black gloves and a yellow sleeve. The angular model remains a preview option only.

Creating a lobby automatically enters a walkable decontamination room; approved guests enter the same room immediately. WASD moves, mouse looks, F toggles the torch, and Esc opens the lobby terminal for requests and the roster. The room has collision, lockers, overhead pipes, floor markings, a sealed basement door and a live four-slot readiness display. Ready/start controls stay available while exploring. Waiting-room positions use cosmetic Realtime broadcasts; admission and starting remain authenticated database operations.

Starting a round plays a roughly eleven-second opening: three seconds of complete darkness, faint distant eyes, a fading distorted MONOCHROME title, then a first-person floor-level view beside the elevator. Two eyelid blinks finish before the camera rises to standing height and controls unlock. The torch rises with the player. Reduced-motion preferences soften camera roll and disable title glitches. Singleplayer uses the same opening. Remote hazmat survivors hold their torches with a posed shoulder/elbow chain and curled glove fingers; each beam originates at its lens.

Co-op shares one monster, four keys, the clue and banked progress. Each player carries their own keys. Getting caught drops unbanked keys back into their drawers and briefly allows rescue by holding E near the fallen teammate. After that window the player watches a survivor; Tab or the teammate button changes the view. Surviving players must all reach the elevator. A team wipe ends the round. The host leaving closes the session; multiplayer pause stops only your controls, so the world keeps moving.

Two players use the original 17-cell map. Three and four players use 21- and 25-cell maps with more storage rooms and search locations. Monster sight, actual movement noise and interactions from all players feed one authoritative simulation on the lobby owner's browser. Supabase authenticates player input ownership and restricts round snapshots to the owner. Clients predict local movement while receiving the same world state. Expired input stops after 0.65 seconds. This is host-authoritative cooperative play, not a competitive anti-cheat service.

A small minority of rounds can contain one silent corner stalk after at least 90 seconds of exposed basement play. The creature must already be behind a wall with a short navigable path; it approaches through the ordinary collision system, stays silent for at most six seconds, and returns to audible pursuit when revealed. It never teleports for the scare. A full capture jumpscare still requires a real catch.

**Supabase setup is required for online play:** see [the setup instructions](supabase/README.md). Singleplayer works independently. Public client configuration is included; the target project must enable Anonymous Sign-Ins and run the supplied migration before the lobby service can connect.

## Play

Select Singleplayer or join a started multiplayer lobby. Open the boarded **DO NOT ENTER** doorway in the elevator lobby. Descend the return stairs, search dresser drawers for **four keys**, and read the **four-digit note** in the basement. Hide in closets when the moving creature approaches. Return upstairs, bank the keys at the four-lock panel, enter the number at the separate keypad, then open the elevator and walk inside.

Key locations, basement corridors, and the four-digit number vary between runs. Banked keys and an accepted code survive a retry. Unbanked keys return to their original drawers when you are caught. The clue is recorded in the HUD after you read it. Leaving a searched drawer open helps track progress.

- **WASD / arrow keys:** move.
- **Mouse:** look; click the scene to capture it.
- **Shift:** run.
- **F:** switch the handheld torch on/off; the torch button also works on touch devices.
- **Hold E:** interact, search, collect, bank keys, or hide/leave a closet.
- **Escape:** pause or close the keypad.
- On touch devices, drag to look, use the arrow pad to move, and hold the interaction button.

The original creature animation viewer remains available through **Creature study** on the title screen, or `?mode=study`. There, the button or **R** toggles running in place.

## Difficulty and atmosphere

The creature sees farther, investigates nearby footsteps and noisy interactions, and pursues faster than your sprint. Walking has a shorter hearing range than sprinting; drawers and closet doors make noise. Walls soften sounds. Noise draws the creature to the sound’s last location, not a hidden player’s current position. Break sight and hide before it sees you enter. Standing still is quiet, and the HUD reports your recent noise level. Muting playback does not disable its hearing.

Difficulty is eased slightly: chase speed is 4.15 units/s versus the player's 3.7-unit/s sprint, hearing reaches 92% of each noise event's nominal radius, and pursuit memory lasts seven seconds after losing sight. The creature has slimmer shoulder/hip joins and a matte black body that avoids round torch highlights.

Both actors collide with walls and furniture. The creature uses a finer obstacle-aware route and swept collision checks, with extra wall clearance for its wide head. The basement has worn surfaces, ceiling pipes, drifting dust, and local footstep/interaction sounds.

Ceiling fixtures in rooms and corridors act as a proximity warning. Beyond 16 units they stay steady at full brightness. As the creature approaches, each fixture independently dims and produces randomly timed electrical glitches and bursts. Within 4.5 units, or during a local hunt, the nearby lights die completely. The player's immediate area also blacks out during a hunt; ambient light, camera fill, luminous surfaces, and fog cannot reveal the room. HUD controls remain usable. Power returns smoothly when the creature leaves or the hunt ends, with fresh warning patterns on each approach. Upstairs stays unaffected by a basement hunt. Lighting freezes while paused.

The player holds a torch that starts on and follows the camera. Its broad beam reaches 24 units, fades continuously from the center to the edges, falls off gradually with distance, and casts wall/furniture/creature shadows. It runs independently of ceiling power, so it can reveal the creature during a blackout; switching it off restores darkness. Physical signs, keys, and the creature reflect its light. The hand and torch bob gently while moving and are drawn separately to prevent clipping through room geometry. There is no battery limit. F ignores held-key repeats and does not toggle while paused or entering a code.

Getting caught plays a 2.25-second jumpscare before the retry screen: the creature's actual head lunges toward the camera, with its entire forehead, chin and horns framed against near-black, white eyes, and a blood-red border fading toward the center and then away. The supplied toothy red mouth is a transparent cutout with no white background or outside border, attached only to this separate jumpscare head. The roaming creature and animation viewer remain mouthless. The mouth image preloads with the page and is hidden until decoded, preventing a white rectangle during loading. Gameplay and controls freeze during the scare; the whole head stays framed on portrait devices. A short, peak-limited scream plays once, independently of the proximity loop, and respects mute. It preloads on the Enter gesture. The scream is an edited excerpt of [Horror Scream1 by Vinrax](https://opengameart.org/content/horror-scream1), released under CC0; see [audio credits](public/audio/CREDITS.md).

## Monster sound

The full audio from the user-uploaded `roblox monochrome sound effect --- Prank.mp4` is extracted to `public/audio/monster.mp3` (about two minutes) and loops during gameplay. No video is bundled. The supplied sound comes from the [referenced Short](https://www.youtube.com/shorts/3YKcnvUfKlY).

Sound is completely silent at 32 units or farther, progressively louder inside that range, capped at 85% gain within 1.5 units, with a gentle power curve and smooth volume changes. It remains audible nearby while hiding and silences during menus, pause, death, and escape. Playback unlocks from the Enter/Continue gesture on desktop and mobile. Use **M** or the **Sound on/off** button to mute.

The wiki mentions footsteps and light warnings but does not verify an exact attenuation radius; these distances implement the requested behavior.

## Reference boundaries

The wiki documents the boarded doorway, upstairs elevator hub, stairs, basement furniture searches, closets, four keys, a run-specific four-digit clue, and two separate elevator lock systems. See [route map](https://monochromegame.wiki/route-map/), [keys](https://monochromegame.wiki/keys-and-code/), and [code](https://monochromegame.wiki/code/). These pages were read on October 14, 2026.

The wiki explicitly does not confirm an exact basement floor plan, fixed key spawns, current-build control bindings, or detailed monster AI. This browser version supplies its own connected maze, collision, patrol/chase behavior, visual danger cues, controls, menus, and retry system around the documented route. It does not claim to reproduce unverified Roblox internals or Part 2. Environment and creature assets are locally generated. The bundled CC0 player model and animation sources are documented in [the hazmat credits](docs/assets/hazmat-character/README.md). Singleplayer needs no external service; multiplayer uses the configured Supabase project.

## Development

Node.js 22.12+ or 24 recommended.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Database authorization and concurrent four-player approvals can also be checked against a temporary PostgreSQL 17 container:

```sh
bash supabase/tests/run-postgres.sh
```

In a restricted cloud workspace, use `npm ci --cache /tmp/creepy-npm-cache` if the default npm cache is not writable. Use the existing checkout; no extra worktree is needed. A WebGL-capable browser is required.

## Vercel

Import `devperson8000/creepy-game-heh` from GitHub into Vercel. Select the **Vite** preset, build with `npm run build`, output **dist**, production branch **main**. The included `vercel.json` supplies the build settings. Subsequent pushes trigger deployment once the GitHub integration is connected. Singleplayer needs no backend. Multiplayer uses Supabase; follow [its setup instructions](supabase/README.md). No service-role secret belongs in this browser application.
