# Monochrome II teaser creature assets

These are alternate downloadable models selected for short, partial trailer glimpses. They are not the three unavailable Sketchfab models originally linked.

## Sonask and Crawlmaster

- Source: [Nightmare Monsters](https://opengameart.org/content/nightmare-monsters)
- Author: Teh_Bucket
- Sonask concept: raymoohawk, released with the artist's permission as stated on the source page.
- Textures: Joao Paulo via 3dtextures.me.
- License: CC0 1.0 Universal. Source archive: https://opengameart.org/sites/default/files/vividcharacters.zip
- Game files: `sonask.glb`, `crawler.glb`.
- Modifications: FBX converted to glTF; smoothed geometry; textures resized and embedded; materials desaturated during rendering; custom deterministic poses and movements. Creature names are internal asset identifiers and are not displayed as sequel lore.

## Hunched skull-faced creature

- Source: [Scary Quadruped Horror Creature](https://www.summerengine.com/asset-store/scary-quadruped-horror-creature-d0d069af)
- Creator listed on source page: Yahia Bahaa.
- License: CC0, explicitly allowing use, sharing and modification. The source identifies it as generated with Meshy 6.
- Direct public asset: https://res.cloudinary.com/dol86wsz1/raw/upload/v1789836897/summer_3d/3d_a06d53f67d9d455b86a320a9_1789836895888.glb
- Game file: `maw.glb` (internal identifier).
- Modifications: removed separate scenery/debris; merged coincident vertices; embedded/resized textures; scaled for a brief doorway glimpse.

Only the files used by the teaser are shipped. Original downloads and rejected candidates remain outside the published game.

## Staged replacement: Needlelimbs

The user selected **Backrooms Entity 38 Needlelimbs** by **Loco** on 21 October 2026.

Source: https://sketchfab.com/3d-models/backrooms-entity-38-needlelimbs-6e8ad10cbcbb49bda63a1b21a660533d

Listing license: https://creativecommons.org/licenses/by/4.0/

The user supplied `Needle.fbx` on 25 October 2026, identifying it as their selected Needlelimbs model. Converted to `needlelimbs.glb` with the supplied skeleton, skin weights, and animation; metarig head/neck bones mapped to the teaser controls. Source locomotion is sampled by approach distance, with a planted stop and independent head/neck peek. No replacement creature is used.

The supplied FBX references `Material.001_Base_color.png` but does not embed it. The GLB currently uses a temporary dark rough material; the source base-color image is still needed for the intended textured appearance. Height and roughness images are optional refinements. The CC0 license in this directory belongs to the older assets, not Needlelimbs; the listing attribution/license above is retained for Needlelimbs.

The mechanical Monochrome head is original game geometry authored in `src/mechanical-head.js`.
