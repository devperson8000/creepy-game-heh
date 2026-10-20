# Halloween gameplay and scheduled release

The update is deployed ahead of launch. An uncached Vercel function supplies the authoritative UTC release time: **2026-10-31 05:00 UTC / October 31, 4:00 PM Australia/Sydney (AEDT)**. A monotonic browser clock follows that signal; a visitor changing their device date cannot release it early. Open menus update automatically. New runs receive the Halloween map once the deadline passes. Existing rounds keep their original map. Guests wait for the owner's authenticated database snapshot to select the same seasonal layout. Refreshing or hiding the browser does not require a future build or operator action.

## Gameplay

B1 has a seeded corridor remix, extra loop routes, moved central storage rooms, pumpkins, candles, webs, skeleton displays and scattered leaves. Dressing stays outside fixture clearance. The ordinary four keys, code, rescue system and multiplayer victory finale remain in place.

The optional hunt starts with a folded invitation at the stairs. Recover three wax seals in order: a faceless pumpkin in STORAGE / ERASED, a skeleton's envelope in the numbered room from the clue, and the extinguished stair lantern. The upstairs chained pumpkin chest opens and reveals a separate Halloween Key. Progress survives capture; co-op progress is shared. The key fits the upstairs pumpkin service panel. Every surviving player must gather there, with downed players revived first.

The B2 visit freezes the hunt and preserves B1 progress and player poses. It includes the elevator descent, a small walkable archive, an automatic stranger conversation, an eight-second original security-monitor teaser for Monochrome II, the stranger's disappearance and a return elevator. Someone must approach the stranger to begin; no normal exit keys are needed. The teaser intentionally provides only a corridor, a passing silhouette, a partial hand and a title. Dialogue has subtitles. The archive, elevator and monitor score is synthesized; the three original stranger lines use local Flite speech with filtering. Mute and volume preferences apply. Reduced motion removes secondary camera/actor motion. The monitor updates at 12 fps and keeps a static texture while idle.

Footage is saved as an earned local reward and can be replayed from the menu. No public test buttons or production preview override were added.

## Character dependency

The selected asset remains **The Hooded Wanderer by Ikk1**:
https://sketchfab.com/3d-models/the-hooded-wanderer-e6bb88b557fd4efca786068af6960230 (CC BY 4.0).

Its linked original source is https://www.meshy.ai/3d-models/The-Hooded-Wanderer-v2-01967a42-82c8-732c-bc75-19b764bccc78 (constantinemaddox; public viewer labels CC0). Sketchfab's official source download requires authentication; the Meshy viewer uses an encrypted, domain-authorized model format. No protection was bypassed. **No source GLB/FBX was available to import.**

The current encounter explicitly uses a temporary authored smooth black cloaked figure with a featureless hood and folded cloth, implemented in `hoodedStranger()` in `src/halloween-experience.js`. It is not presented as the selected downloaded model. Replacing that isolated factory after obtaining the authorized GLB/FBX is the remaining art dependency; preserve both source credits when importing it. The reference pictures are already in `docs/assets/b2-figure-references/`.

## Verification

- Full automated suite: 242 passing tests, including connected remixed layouts at all team sizes, actual furnished navigation, reachable quest props, sequential/idempotent progress, capture persistence, team/proximity restrictions, B2 movement, frozen hunt, pose restoration, release boundaries, uncached API behavior and authenticated session selection.
- Production build passes; existing Three.js chunk-size advisory remains.
- Real solo browser quest passes with actual E holds for every quest item and service panel, walking to trigger the conversation, earned footage and elevator return.
- Two authenticated players pass host layout selection without a guest preview query, shared descent, guest movement, synchronized conversation and guest-controlled return.
- Drawer regression passes with refused sends and artificial 600 ms delay; movement regression passes through the authenticated database fallback and hidden host without reverse avatar steps.
- Countdown browser checks pass at desktop/phone sizes, including reduced motion and a future visitor clock that cannot unlock the update.
- Built production bundle passes both sides of the exact deadline with a mocked authoritative endpoint; production ignores `?halloween=preview` and exposes no test options.
- Desktop archive, dialogue and teaser framing were visually reviewed; phone earned-footage replay, Escape disposal and return to one menu canvas pass.

Production staging and live endpoint verification are recorded after deployment.
