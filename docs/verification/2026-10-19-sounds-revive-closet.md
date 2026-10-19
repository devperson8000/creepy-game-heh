# Sound, revive prompts and closet grilles

Interaction sounds now use short generated layers: low footfall impacts with scuffs, a wooden drawer creak/scrape and closing clack, and a metallic key/lock ring. Existing mute, volume, pause and cleanup controls cover every layer.

Visible nearby downed teammates have an anchored REVIVE prompt with remaining rescue time. Its bar follows the existing hold-E interaction, resets on release or losing the target, and disappears on revival/removal. Prompts respect walls, screen bounds, overlays and player status. Finale startup and page exit clean them up.

The closet mask replaces its single narrow slit with a wide bank of grille openings. The exterior has a nine-bar vent; all front-door parts hide/restore together on entry/exit. Collider and hiding positions stay unchanged.

Verified:

- 203 Node tests passed; production build passed with the existing Three.js chunk-size advisory.
- Two authenticated co-op clients passed the real drawer/45-second rescue checks, a visible over-player prompt, partial E-hold progress, release-to-reset and completed late revival removing the marker. The new prompt check first failed against the previous implementation before passing.
- Real OfflineAudioContext renders verified audible footstep, drawer, key/lock and paper signals without clipping, key-ring decay, and source-node cleanup. The fixture uses deterministic broadband noise matching the production buffer distribution.
- Actual solo hold-E closet entry and exit passed. Desktop and phone grille screenshots were inspected; the complete front restores after exit, without browser errors. The runner skips arrival immediately when its skip button still exists, avoiding a race with natural arrival completion.
- `git diff --check` passed.

Reproduce with `npm test`, `npm run build`, and, against `npm run dev`, `npm run test:browser:coop-rescue`, `npm run test:browser:sounds`, `npm run test:browser:closet`.
