# Source-backed B2 keeper

The B2 archive figure uses **Low-poly hooded character [rigged, Blender]** by **kednar / Pablo López Soriano**, downloaded free from [OpenGameArt](https://opengameart.org/content/low-poly-hooded-character-rigged-blender). The original source is included as [source.blend](source.blend). Both the original and the adapted model are licensed **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**; the complete licence is in [LICENSE.txt](LICENSE.txt).

The MONOCHROME adaptation adds smooth cloth topology, an ankle-length folded mantle, black cloth/gloves/boots and a featureless hood interior. Runtime gestures use the source skeleton and inverse kinematics, including finger contact with the actual archive switch. These changes are by the MONOCHROME project; no endorsement by the source author is implied. The asset's share-alike terms apply to this adapted model; this notice does not relicense unrelated game code.

Runtime asset: [hooded-keeper.glb](../../../public/models/b2/hooded-keeper.glb). It contains 10,769 skinned vertices in three mesh primitives, no external textures and no animation/inference service. Instance-owned geometry, materials and skeletons allow repeated previews without disposing the cached source. The original authored keeper remains a load-failure fallback.

Reproduce with Blender 4.3+: `blender -b docs/assets/b2-keeper/source.blend --python scripts/prepare-b2-keeper.py -- public/models/b2/hooded-keeper.glb`.

This is a newly selected free source under the user's replacement authorization. It is **not** the previously referenced Sketchfab Hooded Wanderer model. Needlelimbs remains pending separately.
