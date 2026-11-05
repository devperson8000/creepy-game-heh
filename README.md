# Backrooms Level 0 escape game

The `/backrooms` path opens a playable Level 0 escape game. Click **Enter the Backrooms**; WASD/arrows move, mouse or drag looks, Shift runs, hold E interacts, Q/R lean, F toggles the torch, Escape pauses, and M toggles the fluorescent ambience. Phone controls include movement and hold-to-run. The upper camera controls toggle VHS, sound and pause. Reduced-motion preferences freeze tape motion and suppress camera bob and light flicker.

The default escape route follows the documented Level 0 objective sequence: collect four wooden ladder sections scattered across the map, fit them one by one, and climb the ladder, retrieve the key, unlock the pitfall door, and reach the exit vent. Walk the narrow beams; falling leads to a separate lower layer with an arrow-marked alternate exit, or a teammate can lower a rescue rope. The six-area base maze spans 72 × 72 metres, with the pitfall room and lower route attached, with patterned wallpaper, carpet, acoustic ceiling panels, fluorescent lighting, and a VHS post-processing pass. The visual target is [Escape the Backrooms](https://store.steampowered.com/app/1943950/Escape_the_Backrooms/): its wallpaper, leaning hatch ladder, fluorescent strips, pillar gallery and square pitfall grid. The base floor plan remains an authored reconstruction, not a verified measured 1:1 copy of the commercial map. Textures and geometry are generated locally; no film or game assets are bundled.

The original MONOCHROME experience remains at **`/`**. Its documentation follows below. Run `node --test tests/backrooms-layout.test.js` for connectivity and collision coverage; `npm test` and `npm run build` verify the repository.

---

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

On the local Vite development server, open `?mode=coop-test`, then press **Open two-player test** and allow the second tab to open. Both tabs use separate anonymous player identities in the same browser. The helper creates a real lobby, approves only its paired test player, and readies player two. Explore the waiting room, enable the mic in either tab, then press **Begin descent** in the host tab. Both tabs play the opening and enter the normal game with the real monster, animations, shared objectives and voice. Switch tabs to control each player; the host simulation keeps ticking while its tab is hidden. Keep both tabs open. Headphones and enabling only one mic at a time prevent feedback when testing on one computer. **Exit test** returns to the main menu and leaves the session.

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

The original creature animation viewer is available only on the local Vite development server at `?mode=study`. There, the button or **R** toggles running in place.

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

For local development, open `?mode=finale` on the Vite development server to preview the same cinematic without a lobby. **Replay**, the **2/3/4 survivor** selector, **Sound on/off**, **Back to menu**, and **Escape** are available. Use **Enable sound** if browser autoplay rules require a gesture. Volume, brightness, graphics quality and reduced-motion preferences are respected. Optional audio failures retain the visual ending; a co-op renderer failure still reaches the legitimate victory result.

The host publishes a fixed cast and start timestamp through the existing authenticated peer/database paths. A four-timestamp clock exchange compensates for device clock differences and network transit; clients sample the same scripted poses instead of streaming cutscene transforms. Hidden tabs catch up without replaying old impacts. Dead teammates are excluded, downed teammates are rescued, and an original co-op round with one remaining survivor keeps that survivor prone and lets the doors close automatically. No database migration is needed for the finale.

Animation and sound provenance, including why Monochrome uses authored head/jaw death motion, is recorded in [the finale credits](docs/assets/finale/README.md). Run `npm run test:browser:finale` for a full-duration preview/cleanup check and `npm run test:browser:coop-finale` for two authenticated clients, host-hidden progression, late catch-up and victory. `FINALE_TEST_RENDER_FAILURE=1` tests recovery. `VOICE_TEST_ICE_SERVERS` can select a local TURN fixture to exercise the real peer path; without it the latter test forces database fallback. Set `GAME_TEST_URL` and `BROWSER_EXECUTABLE` as for the movement checks.

The main menu now starts a hallway crossing within 0.8–2 seconds and schedules later crossings roughly every 2.2–4.2 seconds while visible. Reduced motion suppresses these sightings. Nearby drawers use stable interaction targets; cabinet obstruction cannot cancel an E hold.

Published builds expose only Singleplayer and Multiplayer. Creature study, the paired co-op test and the finale preview have no menu links, and their old query URLs open the normal game menu in production. Local development retains direct test URLs for automated checks. Run `npm run test:browser:release-menu` against a production preview to verify the release menu and normal game navigation.

Interaction sounds now layer soft footfalls with low impacts, drawer scrapes with a wooden creak and closing clack, and key pickups with a short metallic ring. The same game volume/mute controls apply. Downed teammates have a visible over-player REVIVE prompt with the rescue time remaining and an E-hold progress bar that resets on release or looking away. The closet view uses a much wider bank of grille openings; the outside door has a matching nine-bar vent, and the complete front hides/restores together on entry/exit.

The full gameplay polish adds a short hush before six, low threat-driven heartbeat/drone, sprint breathing and stereo pipe knocks. Silent ambushes suppress threat cues. Torch movement now settles smoothly with walking, sprinting, looking and holding an interaction; its beam stays aligned with aim. Revived survivors visibly get up, monster locomotion blends around movement, and drawer/elevator easing is independent of render rate. Interaction reticles, key/objective highlights and keypad feedback are clearer and respect reduced motion. Normal finales omit the preview progress strip.


Basement storage rooms now carry worn, wall-painted warnings including **IT HEARS YOU**, **DON'T LET IT SEE YOU**, and **DON'T WAIT FOR SILENCE**. Larger co-op basements add more messages. Paint attaches only to solid walls, follows the room lighting and torch, and does not obstruct interactions or replace the four-digit clue.

After six, Monochrome searches in place for at most two seconds. Failed investigations and prolonged pacing trigger a reachable patrol destination with a short commitment to leave the area; repeated unseen noise cannot hold it there. Seeing a player immediately restores pursuit. Valid patrol routes remain intact through corners rather than being rebuilt repeatedly. These rules run in solo and in the co-op host simulation. Run `npm run test:browser:wall-notes` with the development server running to capture three torch-lit examples in `work/`.

The mode-selection menu includes a Halloween countdown to **October 31, 2026 at 9:00 PM Sydney time (AEDT)**, with a glowing pumpkin, embers, bats and a cobweb. It uses one absolute deadline across visitor timezones, respects reduced motion, and replaces the timer with a finished message at zero. Run `npm run test:browser:halloween` against a running server to check timing, expiry and responsive menu navigation.


Drawer holds now complete in 0.3 seconds, with stable selection across cabinet trim and open drawers. Co-op starts the drawer animation immediately and retries an ordered, acknowledged request if the action channel is busy or delivery is delayed. Duplicate requests cannot toggle drawers or take keys twice. Nearby drawer actions bypass cabinet obstruction checks and show no failure toasts. The host still owns shared keys, inventory and ordinary interaction range. Run `npm run test:browser:drawers` and `npm run test:browser:coop-drawers` against the development server for the full drawer regression checks.

The plain-map release is already live and its separate announcement has been removed. Current runs use the balanced narrower maze, deep clear stairs, three-drawer cabinets, recessed grille closets and sprint stamina. Monochrome matches sprint speed and closes on walking players; four keys and the code still unlock the normal elevator ending. Existing rounds retain their host-selected edition.

The Halloween update unlocks automatically at **9:00 PM on 31 October 2026, Sydney/AEDT (10:00 UTC)** using the trusted server clock. Until then the plain game remains active. After release, the house introduction, decorated map, optional Halloween Key scavenger hunt/B2 archive, improved ambience/proximity voice and house escape become available. Needlelimbs and the repaired mechanical head remain confined to the Monochrome II teaser. The public `/testhalloween` path redirects to the separate password-protected test deployment; no test controls or password API ship in the public bundle. Original recordings and uploaded models remain intact.

## Current Level 0 polish and empty entity slot

The old Needlelimbs and Sonask/Stalker encounters, controller modules and map-specific recordings have been removed from Level 0. No monster is loaded, simulated or heard, including through the old ambush URL. Shared assets needed by the original Monochrome game and teaser remain intact. The invisible integration point in src/backrooms-entity-slot.js reserves a Bacteria identity, lower-layer spawn, height and door-aware navigation with modelUrl=null. It does not create an invisible damaging entity. src/backrooms-encounter.js preserves world visibility queries for interactions without adding an actor. A better model needs explicit integration; dropping a file into the repository does not silently enable a stand-in.

Research: [the Ladder entry](https://escapethebackrooms.fandom.com/wiki/Ladder) and [Level 0 guide](https://escapethebackrooms.fandom.com/wiki/Level_0) establish four pieces, ladder repair, climbing to a key, a locked door, and balancing over pitfalls. [The map reference](https://escapethebackrooms.org/maps-keys/level-0-map) and [Steam ladder-room screenshot](https://steamcommunity.com/sharedfiles/filedetails/?id=2917741491) inform landmarks, wallpaper and the high wall-box ladder. The user's requested map-wide scatter is intentional: guides commonly put the fragments near the ladder. It should not be described as the original game's exact item placement.

Four reachable sections now sit in the arrival rooms, column hall, far offices and gallery. Each pickup contributes one section to the team's inventory. Hold E at the ladder to fit available sections, visibly growing the wooden rails and rungs from bottom to top. You can install a partial collection and return later. All four fitted sections are required before climbing; the key remains unreachable from floor level. Climbing follows the leaning ladder instead of rising at an arbitrary position. Original, short wooden assembly sounds are spatialized at the ladder. The hatch is a hollow wall box; the door swings open rather than disappearing.

The user’s supplied pitfall images now guide a broad fluorescent room with a 7 × 8 grid: 56 square shafts, narrow carpeted walkways, deep lined walls and a separately traversable lower layer. Geometry and collision share dimensions in src/backrooms-pitfalls.js. The 6.4 m authored drop survives into a dim lower area with columns and partitions. Every shaft has a navigable path to a side door and a dark alternate stair/vent room, with a flashlight on its table. The upper route now ends at a dark, opening door backed by a white-lit passage; white light spills through its opening. The door must be opened before entering the exit passage. This is separate from the lower alternate vent. A rope coil is found beyond the grid; a player above must lower it, then the fallen player holds E to climb over time. These proportions are authored from references, not verified original-game measurements. Wallpaper uses finer vertical chevrons, the carpet is paler, fluorescent fittings have three bright strips, and the gallery has larger square pillars. World-space dust, VHS controls, reduced motion and original Monochrome remain available. Level 1 is still not implemented.

The round browser check covers absence of old creature/audio requests, all four pickups, four distinct assembly stages, climbing/key/door, falling/recovery/torch/vent, replay and mobile controls. Obsolete tests for the removed map-specific hunts were replaced by empty-entity and assembly coverage; the original game's monster tests remain.

## Backrooms multiplayer

Open **Multiplayer** on the Level 0 start screen. Create a public server or a friends-only lobby, share the eight-character code/invite link, and ready up. The host starts a 2–4 player run. Friends-only rooms are unlisted in the browser and require the host to accept a join request; their code is a room locator, not a password. This uses the already configured anonymous Supabase Auth/RLS-protected lobby and snapshot RPCs. No service key or new database migration is used. Backrooms-prefixed rooms are filtered out of the original Monochrome directory.

The lobby layout was rebuilt from [this Escape the Backrooms lobby screenshot](https://gamerjournalist.com/how-to-play-multiplayer-in-escape-the-backrooms/): player/status table on the left, green Invite Friends button, level preview and co-op/difficulty/start panel on the right. Browser room codes replace Steam invitations. The exact proprietary font, Steam integration, and every version's UI are not bundled or claimed identical. The [publisher's current patch notes](https://wearesecretmode.com/escape-the-backrooms-patch-notes) confirm room-code joining; that is supported here. Only this build's Level 0 and Normal co-op rules are offered.

The host owns movement validation, shared parts/assembly/key/door and snapshots. The reserved Bacteria snapshot is empty in this exploration build. Guests predict bounded movement commands and reconcile against acknowledged host state. Each player has their own ladder climb, fall and recovery state. After collecting the rope beyond the grid, hold E near a fallen teammate from a beam to lower it; the fallen player then holds E at the rope to climb. Everyone must enter the exit vent. Enemy captures are disabled while the entity slot is empty. The host can restart the same room for the entire team. Pause menus stop local input while the shared world continues. Leaving closes the connection; a host departure ends the session (no host migration or reload recovery is promised).

WebRTC proximity voice and identity-bound, length-limited text chat reuse the existing peer connections. Microphone permission is requested only when its control is clicked. Voice/chat connectivity can depend on the configured ICE servers; the authenticated gameplay transport does not depend on a peer connection. Chat reports when peers are still connecting instead of claiming delivery.

The exact hazmat remains pending the user's asset. Teammates currently use neutral tracking figures, not the discarded hazmat or an alleged official replacement. Once BACKROOMS_PLAYER_MODEL points to the supplied validated model, teammate rendering uses that adapter too.

Verification: tests/backrooms-coop.test.js and tests/peer-gameplay.test.js cover authority and protocol behavior. scripts/check-backrooms-coop-browser.mjs uses two real Supabase-backed browser clients on port 5182 to check lobby codes, readiness, movement, shared pickup, rescue, team loss/retry, all-player exit and cleanup.

Pitfall research: [Level 0](https://escapethebackrooms.fandom.com/wiki/Level_0), [the Steam walkthrough](https://steamcommunity.com/app/1943950/discussions/0/3952532649330813967/), and [the lower-route guide](https://escapethebackrooms.org/levels/level-0-the-lobby-Walkthrough) support upper vent versus lower alternate exit, rope found beyond the grid, and Bacteria risk after a fall. Exact Bacteria spawn rules and measured lower floor plans are not verified. The entity remains disabled pending a better model.
