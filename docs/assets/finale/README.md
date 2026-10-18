# Finale animation and model provenance

- Survivors: the repository's existing licensed `/models/hazmat-survivor.glb` asset, cloned through `createPlayerAvatar` so each actor has separate rig and material ownership. See `docs/assets/hazmat-character/SOURCE-LICENSE.txt` for the original asset attribution.
- Monochrome: the repository's own procedural `src/creature.js` model, with a small authored jaw animation in `src/finale-actors.js`.
- Animations: the hazmat model's existing run/idle animation tracks plus authored diving, bracing and button-reach poses. The procedural monster has no compatible external humanoid skeleton, so no external death clip or third-party downloaded animation is represented as having been used.
- The finale uses a stylized, non-graphic mechanical defeat without blood or dismemberment. That preserves the escape story and all 52 seconds while avoiding an explicit injury shot.
