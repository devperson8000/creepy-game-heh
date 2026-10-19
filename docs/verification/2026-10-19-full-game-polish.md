# Full gameplay and animation polish

Reviewed the title menu, waiting room, controls, exploration, search/puzzle interactions, hiding, monster presentation, capture/retry, co-op movement/rescue/spectating, accessibility settings and finale against the existing rules.

## Changes

- Room sound quiets over the last 2.5 seconds before six. Hunting adds a restrained low drone and proximity-based heartbeat, with exertion breathing for sprinting and a quieter mix while hiding. Distant pipe knocks have stereo placement. Silent ambushes suppress threat-based audio cues. Volume, gesture gating, pause, mute and disposal cover all layers; unchanged bus targets do not schedule redundant automation.
- Torch bob eases into and out of movement, distinguishes sprinting, settles after looking and dips slightly during held interactions. Its switch moves toward its new position; its actual beam stays aligned with aim and toggles immediately. Reduced motion removes added hand motion. Torch switching and keypad confirmation have distinct short effects.
- Monster gait eases around travel rather than snapping between running and idle. This only changes presentation. Buffered teammate locomotion adjusts stride cadence to observed speed; revived teammates rise from their fallen clip over 0.65 seconds before normal locomotion and torch holding resume.
- Drawers and elevator doors use exponential easing, producing matching positions at different frame rates. Exposed keys have a small slow angular movement.
- Interaction targets have a clearer reticle and hold track. Key/objective changes receive a restrained highlight. Keypad rejection/acceptance states are clearer; rejection motion respects reduced motion. Closet HUD clutter is subdued. HUD text/state changes avoid some redundant writes.
- Lost pointer capture and clearing controls also clear look dragging, preventing stale touch movement after release or pause.
- The normal finale omits the preview progress strip. Its 30-second timing, slower chase, visible belly landing, prone hold, walkout and jumpscare mouth remain intact.

Clock start/release, chase difficulty, collision, objectives, 45-second rescue window and authoritative multiplayer movement remain unchanged. Published menus still expose only Singleplayer and Multiplayer.

## Verification

- **211 Node tests passed**, including new regressions for frame-rate-independent props, torch settling, gradual revival with the real GLB, lost drag capture, creature gait blending and bounded atmosphere mixing. The initial prop/revival/torch/input regressions failed against the previous behaviour before implementation.
- Production build passed. The existing Three.js chunk-size advisory remains.
- Production solo playthrough passed arrival, focused pause, saved settings, portrait layout, resume, real keypad denial/acceptance, monster capture, retry and elevator escape without runtime errors.
- Two authenticated clients passed movement prediction, command acknowledgements, visible remote movement, hidden-host progression and replicated torch state over database fallback. In that run, local and remote movement had zero reverse steps; the largest sampled remote step was 0.233 world units. This is a regression sample, not a universal network-performance guarantee.
- Real two-client rescue passed drawer visibility, 45-second deadline replication, over-player progress filling on E, release-to-reset and completed late rescue removing its prompt.
- Production closet entry/exit and desktop/portrait grille view passed. Actual survivor get-up renders were inspected at four stages.
- Generated Foley, torch and keypad signals passed real OfflineAudioContext rendering, peak/decay checks and source cleanup. A gesture-gated live AudioContext passed pre-six ducking, heartbeat scheduling, sprint/closet updates, mute, pause and closure.
- Solo and real co-op clock checks passed safe exploration, pause semantics, six warning/release, permanent clock removal and late-snapshot cleanup. Sample host/guest displays matched at 4:02.
- Full real 30-second finale preview passed titles, replay, 2/3/4 casts, sound controls, portrait layout, repeated menu returns and model-load retry. Real co-op victory passed synchronized playback (sample 2.112 / 2.203 seconds), hidden host, catch-up and authoritative victory.
- Production release-menu checks passed all former test URLs, normal mode selection and solo pause/return. `git diff --check` passed.

Browser fixtures now tolerate a delayed first HUD observation by comparing the displayed time with active game time, explicitly mark the monster released when arranging a capture, intercept cache-busted Vite entry URLs, and activate audio from a document-level gesture. These fixture corrections do not alter game rules. Network assertions retain real state/transport while suppressing GPU drawing after startup. Physical device performance and fresh microphone capture were not measured in this pass.

Reproduce using `npm test`, `npm run build` and the relevant `test:browser:*` commands in package.json. Developer helper checks use the Vite development server; release-menu, solo polish, closet and solo clock checks also run against the production preview.
