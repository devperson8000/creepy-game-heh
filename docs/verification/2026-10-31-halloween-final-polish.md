# Halloween final polish — 31 October 2026

The release is **20:00 Australia/Sydney, 31 October 2026 (09:00 UTC)**. Clock-delay commits6999b1b/668751c were published first and the live API confirmed version`halloween-2026-evening`,releaseAt1793437200000,releasedfalse. Per-release timer/briefing viewing markers use the evening identity. Existing old pages require refresh.

## Scope and release integration

The public build previously contained the timer/briefing without a seasonal gameplay entry. Restore the existing approved Halloween modules behind the trusted release signal. Ordinary runs retain the balanced plain maze, three-drawer cabinets, original Monochrome/elevator and microphone hearing before release; new seasonal runs gain the house opening, decorated maze, optional Key/B2 quest, archive teaser, proximity chat and house escape at release. Host/checkpoint selection pins each round. Needlelimbs/rebuilt Monochrome remain sequel-teaser-only. Public test routes redirect to the separate protected build; no private UI or password API is in the public entry/bundle.

Shared128px owned linear bump/roughness maps add restrained material detail to house/map props, sleeves, B2, the service route and teaser/metal head. Refined the key grip's fingers/wrist, beveled panel and monitor, and ending title framing. Static bulb/lantern/bone/wreath parts are batched while animated candles/paper remain animated. Model/recording files are preserved: all9GLBs,15embedded textures,43audio files and2standalone images pass integrity checks. Common public/tester production source matches across138files; all49shared launch files match.

## Verification

- Full`npm test`: public449/449; private437/437. Production builds pass, with the existing main/Three chunk-size advisory. Existing focused-button/W/Shift/microphone-sensitivity coverage is retained; physical maze/drawer checks now cover both editions.
- Production-bundle browser verifies before/at-deadline selection, original head,45-cell solo layout, three drawers per room, seasonal decoration gate and no unrestricted test entry.
- Actual authenticated two-client database-fallback browser verifies microphone levels → shared scream pursuit, distant conversation below chase range, W/Shift movement without reverse corrections, mute and authoritative opening of all three drawer rows through real guest E holds. No invalid input/runtime errors. Draw-suppressed fixtures explicitly update world matrices and wait for the intended ray target/authoritative pose before holding E.
- Native incoming-microphone routing verifies centered ordinary chat, very quiet middle distance, silent far distance, HRTF left/right/turns, no raw-audio bypass, and muted/invalid-frame silence. This invokes the real incoming-track handler with a native captured stream. Direct two-peer WebRTC transport was not verified here: the cloud browser produced zero ICE candidates. A separate-device voice playtest remains necessary; no transport/latency guarantee is inferred from the audio-graph checks.
- Rendered B2 check passes key/turn/wall mount, imported keeper/switch contact, decoded voice peaks, archive/Previously/current-teaser/return, portrait and real walking approach. Model material maps decode1380×1380. Current teaser passes three pixel ratios, real gait/corner/mechanical-head/title renders, no retired model requests and disposal.
- Entire house intro passes four recorded lines, sound enable, full story/title/menu, two-second skip, delayed/failing load, blur, portrait/reduced motion and disposal.
- Decorated-map browser passes code reading and every quest prop through E. Ending browser passes solo/team rescue, portrait, real solo house victory without the optional key and disposal. Ending title bounds pass phone, short landscape, ultrawide and desktop.
- Countdown browser passes fullscreen, focus/mute, exact zero, once-only film, replay, hidden/unknown clocks, phone layout, intro-after-release reload and gameplay disposal. Private authorized countdown/direct-film/buildup/charge/static/music/titles/replay/back passes.

## Independent review and fixes

Independent final reviewer ran33focused tests and identified four user-visible issues. All fixed in one pass with RED→GREEN regressions:

1. Legacy saved maze/row fields: central`createCoopRound` reconstructs and normalizes before creating the world. Storage, one-row and current three-row checkpoint cases render/update without missing drawer targets.
2. Null positional frame: ordinary chat is explicitly centered; invalid active spatial frames remain silent. Native microphone RMS regression verifies both.
3. Plain exit signs: only seasonal rounds advertise B2/house routes; ordinary rounds retain EXIT/KEEP THE EXIT CLEAR.
4. Ending first Enable click: the displayed action is explicit and generic pointer unlock excludes its button; deterministic browser activation regression passes.

The opening also has RED→GREEN regressions for loading readiness and initial browser unlock; ending title/control overlap has a four-viewport regression. No deferred code-review findings remain.

Deployment IDs and live smoke verification are recorded after publication.
