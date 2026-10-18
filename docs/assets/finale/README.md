# Finale animation provenance

The survivors use the game's existing `hazmat-survivor.glb`: sandsound/tigertowel's CC0 hazmat model, with CC0 Quaternius Animated Men clips already retargeted to its 29-bone rig. See the [existing source and license record](../hazmat-character/SOURCE-LICENSE.txt).

The [Quaternius Animated Men pack](https://quaternius.com/packs/animatedmen.html) was checked again during finale implementation. Its web page identifies the pack as CC0; the installed GLB contains Death, Idle, Jump, Run and Walk clips. Run and Walk drive the pursuit and exit. Dive, bracing and the visible gloved-hand button contact are additive cinematic poses on that actual rig.

Monochrome is a procedural mesh with separate torso/head/limb groups, rather than the source pack's humanoid skeleton. A humanoid Death clip cannot bind to its neck or jaw and describes a whole-body collapse, whereas this shot requires a detached head. The severing, falling/bouncing head, diminishing jaw spasms and final still pose are authored procedural tracks in `src/finale-actors.js`. No downloaded humanoid clip is represented as the monster's dying animation.

The monster audio is the existing user-supplied `/audio/monster.mp3`. Cinematic panting, steps, door/metal impacts and elevator machinery are generated with Web Audio; no new third-party audio files are required.
