# Revised creature teaser verification

Supersedes the earlier voice-imitation teaser. Three new downloaded CC0 creature models now appear in short, separate, partly obscured shots. The 25-second film ends with a brief Monochrome silhouette, black cut and plain MONOCHROME II title. No monster speaks or copies a voice; the help recording and old tagline are removed. Stranger framing/outro speech and subtitles match the new scene.

Verified:

- `npm test`: 252 passing. Added a 60fps timeline sweep proving three separate creature windows, each under 2.1 seconds, no help/monster dialogue, deterministic seeking and the existing 43-second encounter deadline. Audio unlocking still joins the current film rather than replaying the opening.
- `npm run build`: passes; existing chunk-size advisory remains.
- `npm run test:browser:teaser`: full real-time 25-second playback sees all three actual GLB actors separately; rejected help recording never loads; no premature gameplay return; stranger line, disappearance and persistent dark monitor; full replay/end hold; mute/reduced motion; 390px/320px layouts; deliberate missing creature load fails cleanly; repeated replay/back/frame disposal. No browser exceptions.
- `npm run test:browser:coop-halloween`: real authenticated host/guest seasonal layout, shared B2 entry, archive movement, synchronized encounter completion, guest return control and preserved B1 poses/progress.
- Reviewed actual actors and rendered story shots. Corrected imported bone names and arm poses, desaturated the source hide textures, added physical cover to conceal the first creature's torso, crouched/turned the crossing creature, removed unrelated scenery from the skull-faced asset, and restrained its doorway reveal. Desktop and phone playback screenshots reviewed.
- Read-only code review found no important defects. Applied the minor finding to honor the timeline's black cut before the end title.

Source links, creators, CC0 licenses and modifications: `public/models/teaser/CREDITS.md`. The three embedded GLBs total about 3.3 MiB, with resized textures and private per-instance geometry/material/texture resources. Original downloads, rejected candidates and conversion scripts remain under ignored work/.

The update's scheduled October 31, 2026 at 16:00 Australia/Sydney release gate, quest, shared clock and normal endings are unchanged. Existing password-authorized tests can preview the revised teaser before release.
