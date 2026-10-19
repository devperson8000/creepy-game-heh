# MONOCHROME — browser escape game

A first-person monochrome horror escape game built with Three.js and Vite. Uses the creature developed in this repository and the documented escape loop from [monochromegame.wiki](https://monochromegame.wiki/walkthrough/).

## Modes and co-op

The opening screen offers **Singleplayer** and **Multiplayer**. Multiplayer uses Supabase anonymous authentication, owner-approved named lobbies and a maximum of four players. The host starts once two to four members are ready. The selected player model is the **curved yellow hazmat survivor**, with numbered patches, teammate names and a visible handheld torch. First-person hands wear matching black gloves and a yellow sleeve. The angular model remains a preview option only.

Creating a lobby automatically enters a walkable decontamination room; approved guests enter the same room immediately. WASD moves, mouse looks, F toggles the torch, and Esc opens the lobby terminal for requests and the roster. The room has collision, lockers, overhead pipes, floor markings, a sealed basement door and a live four-slot readiness display. Ready/start controls stay available while exploring. Waiting-room positions use cosmetic Realtime broadcasts; admission and starting remain authenticated database operations.

Starting a round plays a roughly eleven-second opening: three seconds of complete darkness, faint distant eyes, a fading distorted MONOCHROME title, then a first-person floor-level view beside the elevator. Two eyelid blinks finish before the camera rises to standing height and controls unlock. The torch rises with the player. Reduced-motion preferences soften camera roll and disable title glitches. Singleplayer uses the same opening. Remote hazmat survivors hold their torches with a posed shoulder/elbow chain and curled glove fingers; each beam originates at its lens.

Co-op shares one monster, four keys, the clue and banked progress. Each player carries their own keys. Getting caught drops unbanked keys back into their drawers and gives teammates 45 seconds to rescue them by holding E near the fallen teammate. After that window the player watches a survivor; Tab or the teammate button changes the view. Surviving players must all reach the elevator. A team wipe ends the round. The host leaving closes the session; multiplayer pause stops only your controls, so the world keeps moving.

Two players use the original 17-cell map. Three and four players use 21- and 25-cell maps with more storage rooms and search locations. Monster sight, actual movement noise and interactions from all players feed one authoritative simulation on the lobby owner's browser. Supabase authenticates player input ownership and restricts round snapshots to the owner. Clients predict local movement while receiving the same world state. Expired input stops after 0.65 seconds. This is host-authoritative cooperative play, not a competitive anti-cheat service.

A small minority of rounds can contain one silent corner stalk after at least 90 seconds of exposed basement play. The creature must already be behind a wall with a short navigable path; it approaches through the ordinary collision system, stays silent for at most six seconds, and returns to audible pursuit when revealed. It never teleports for the scare. A full capture jumpscare still requires a real catch.

**Supabase setup is required for online play:** see [the setup instructions](supabase/README.md). Singleplayer works independently. Public client configuration is included; the target project must enable Anonymous Sign-Ins and run the supplied migration before the lobby service can connect.

## Team voice chat

The waiting room and multiplayer game include direct WebRTC voice for up to four players. Microphones start off. Click **Mic off** to enable your microphone and approve the browser permission, then click again to mute. Muting stops microphone capture. Voice stays connected during the opening and gameplay. A glowing microphone appears above a talking teammate's head, and the voice panel shows who is speaking. Speech detection uses actual local/received audio with a short pause hold; no voice is recorded. If browser autoplay blocks incoming audio, click **Enable voice audio**. Leaving closes the calls and releases the microphone.

Supabase Realtime carries SDP/ICE signalling on a room-specific channel, while audio uses encrypted WebRTC connections. Clients filter signalling to accepted roster members and the intended recipient. The broadcast channel uses the project's existing public Realtime configuration; it is not a server-authenticated private signalling service. Lobby approvals and game actions continue to use their authenticated RPCs.

Default ICE servers provide STUN discovery. For players behind restrictive NAT/firewalls, configure a TURN relay in Vercel's **VITE_WEBRTC_ICE_SERVERS** environment variable (JSON array of RTCIceServer objects), then redeploy. TURN credentials in this browser variable are public: use scoped, expiring credentials or a provider-supported browser credential; never use an administrative secret. Without a configured relay, some network pairs cannot connect. Microphone access needs HTTPS or localhost. Voice is team-wide and does not generate monster noise events.

## Two-tab test

Choose **Two-tab co-op test** on the title screen (or open `?mode=coop-test`), then press **Open two-player test** and allow the second tab to open. Both tabs use separate anonymous player identities in the same browser. The helper creates a real lobby, approves only its paired test player, and readies player two. Explore the waiting room, enable the mic in either tab, then press **Begin descent** in the host tab. Both tabs play the opening and enter the normal game with the real monster, animations, shared objectives and voice. Switch tabs to control each player; the host simulation keeps ticking while its tab is hidden. Keep both tabs open. Headphones and enabling only one mic at a time prevent feedback when testing on one computer. **Exit test** returns to the main menu and leaves the session.

For the automated two-tab browser check, start `npm run dev`, install Chromium once with `npx playwright install chromium`, then run `npm run test:browser`. It opens two tabs in one browser context, checks automatic pairing, actual microphone audio/speaking indicators, mute/capture release, blocked-mic recovery, both opening sequences, hidden-host gameplay, and replicated movement/torch state. `GAME_TEST_URL` selects a development server (default `http://localhost:5173`); `BROWSER_EXECUTABLE` selects an existing Chromium. On environments that require a TCP relay, set `VOICE_TEST_ICE_SERVERS` to an RTCIceServer JSON array for the test. The runner generates its own synthetic microphone tone and does not request a physical microphone.

## Presentation and control polish

The title backdrop is a live corridor scene with brief, irregular creature crossings behind real occluding walls. Menus, pause/keypad screens, voice/team panels and the objective HUD share subdued industrial styling with phone layouts and keyboard focus states. The waiting room has soft contact shadows, restrained dust, clearer signage and a generated electrical hum with occasional distant pipe knocks. Room ambience starts only after a gesture; M or its sound button mutes it. The elevator hub has floor joints, hazard markings and return-point signage. The held torch has a smaller profile, visible glove/cuff detail and a physical switch.

Touch players can hold **Run** while moving, toggle the waiting-room torch, and open the terminal without using a keyboard. Held touch controls release on pointer cancellation, focus loss or pause. Holding Escape does not repeatedly toggle pause. Clicking back into the scene also unlocks game audio on browsers that require a fresh gesture. Co-op objectives count keys across the whole team and distinguish finding the clue, entering its code, opening the elevator and stepping inside.

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

A digital clock starts at **3:00 AM** when the opening finishes. Every game minute takes half a real second, so **6:00 AM arrives after 90 seconds of active play**. Until then, Monochrome is hidden, silent and cannot catch anyone; opening the boards does not release him. At six, the HUD clock disappears, a large **6:00 / IT IS HUNTING** warning flashes briefly, and Monochrome begins approaching from a storage room on the opposite side of the basement. The warning respects reduced motion. Solo pause/keypad menus stop the clock. Co-op uses the host clock for everyone and keeps ticking through individual pause menus. A solo retry preserves the same clock and banked progress; starting a new run resets it.

The creature sees farther, investigates nearby footsteps and noisy interactions, and pursues faster than your sprint. Walking has a shorter hearing range than sprinting; drawers and closet doors make noise. Walls soften sounds. Noise draws the creature to the sound’s last location, not a hidden player’s current position. Break sight and hide before it sees you enter. Standing still is quiet, and the HUD reports your recent noise level. Muting playback does not disable its hearing.

Difficulty is eased slightly: chase speed is 3.95 units/s versus the player's 3.7-unit/s sprint, hearing reaches 92% of each noise event's nominal radius, and pursuit memory lasts 6.5 seconds after losing sight. The creature has slimmer shoulder/hip joins and a matte black body that avoids round torch highlights.

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
# With a server running (GAME_TEST_URL defaults to http://localhost:5173):
npm run test:browser:hunt
npm run test:browser:coop-hunt
```

Database authorization and concurrent four-player approvals can also be checked against a temporary PostgreSQL 17 container:

```sh
bash supabase/tests/run-postgres.sh
```

In a restricted cloud workspace, use `npm ci --cache /tmp/creepy-npm-cache` if the default npm cache is not writable. Use the existing checkout; no extra worktree is needed. A WebGL-capable browser is required.

## Vercel

Import `devperson8000/creepy-game-heh` from GitHub into Vercel. Select the **Vite** preset, build with `npm run build`, output **dist**, production branch **main**. The included `vercel.json` supplies the build settings. Subsequent pushes trigger deployment once the GitHub integration is connected. Singleplayer needs no backend. Multiplayer uses Supabase; follow [its setup instructions](supabase/README.md). No service-role secret belongs in this browser application.

## Movement and polish pass

Co-op movement now resends numbered, bounded movement commands. The host acknowledges commands only after simulating them; clients rebuild from that state and replay the unacknowledged remainder. Snapshot delivery therefore does not discard the movement a player has just made. Teammates and the monster render through timestamped pose buffers with bounded extrapolation and adaptive buffering for irregular delivery. Walking/running animation remains stable between input packets.

Where available, the existing WebRTC mesh carries gameplay over an unordered data channel. Peer DTLS fingerprints are bound to authenticated member actions and owner-authenticated snapshots before gameplay messages are accepted. Lobby approvals and interactions continue to use authenticated RPCs. The database path carries the same command history and acknowledgements when peer connectivity is unavailable; restrictive networks therefore retain the movement fix. Apply every SQL file in `supabase/migrations` in order for a new installation. The `movement_command_replay` migration is backward compatible with the previous seven-field input format and changes no table access policies.

Pause now includes saved look sensitivity, brightness, game volume, visual quality, and reduced-motion preferences. Automatic quality adjusts render resolution under sustained slow frames. The arrival can be skipped with Space or its on-screen button. Reduced motion suppresses camera sway, warning strobes, and menu sightings. Gameplay has generated ballast hum and distant pipe knocks, synchronized with game mute/volume. Pause, keypad, HUD, retry and escape screens share the rounded menu styling, focus states, and phone layouts.

Run `npm test`, `npm run build`, and `bash supabase/tests/run-postgres.sh` for unit/build/database checks. With a server running, `npm run test:browser:polish` checks solo arrival, settings, pause/resume and mobile screens; `npm run test:browser:movement` uses two real authenticated players and deliberately exercises database-fallback movement. `GAME_TEST_URL` selects the server. The new polish and movement scripts default to `/usr/bin/chromium` or accept `BROWSER_EXECUTABLE`. The full voice/two-tab test remains `npm run test:browser` and requires a working WebRTC route or configured TURN relay. Neither browser nor Internet/network conditions can guarantee a universal frame rate or zero latency.

## Co-op elevator finale

Rounds that begin with two to four players now finish with a shared 30-second cinematic when the fourth key is banked and the correct code has been accepted, in either order. Gameplay freezes while the last survivor races upstairs, dives into the elevator, and a teammate visibly presses the close button. The chase keeps its existing shot length with slower travel and stride cadence. The airborne dive lands face-down; the survivor stays on his stomach through the ascent and stands only for the walkout. Monochrome remains caught in the doors for about four seconds; passing shaft fixtures and the changing floor indicator show the ascent before its head is severed and drops onto the cab floor with black blood. The ending uses the exact same transparent red mouth texture as the jumpscare, opening during the struggle and settling after death. The scene ends with the rescued team stepping into daylight and **YOU ESCAPED. / TOGETHER.** Singleplayer keeps its existing escape ending.

Use **Test finale animation** on the main menu to preview the same cinematic without a lobby. **Replay**, the **2/3/4 survivor** selector, **Sound on/off**, **Back to menu**, and **Escape** are available. `?mode=finale` also opens the preview; use **Enable sound** if browser autoplay rules require a gesture. Volume, brightness, graphics quality and reduced-motion preferences are respected. Optional audio failures retain the visual ending; a co-op renderer failure still reaches the legitimate victory result.

The host publishes a fixed cast and start timestamp through the existing authenticated peer/database paths. A four-timestamp clock exchange compensates for device clock differences and network transit; clients sample the same scripted poses instead of streaming cutscene transforms. Hidden tabs catch up without replaying old impacts. Dead teammates are excluded, downed teammates are rescued, and an original co-op round with one remaining survivor keeps that survivor prone and lets the doors close automatically. No database migration is needed for the finale.

Animation and sound provenance, including why Monochrome uses authored head/jaw death motion, is recorded in [the finale credits](docs/assets/finale/README.md). Run `npm run test:browser:finale` for a full-duration preview/cleanup check and `npm run test:browser:coop-finale` for two authenticated clients, host-hidden progression, late catch-up and victory. `FINALE_TEST_RENDER_FAILURE=1` tests recovery. `VOICE_TEST_ICE_SERVERS` can select a local TURN fixture to exercise the real peer path; without it the latter test forces database fallback. Set `GAME_TEST_URL` and `BROWSER_EXECUTABLE` as for the movement checks.

The main menu now starts a hallway crossing within 0.8–2 seconds and schedules later crossings roughly every 2.2–4.2 seconds while visible. Reduced motion suppresses these sightings. Co-op drawer obstruction warnings are silent; proximity and visibility checks still prevent opening drawers through walls.
