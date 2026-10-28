# Private launch countdown and stranger briefing

Adds two password-authorized hub cases: **Countdown launch sequence** and **Stranger launch briefing**. Both use the same shared production timer and film as main commit a1cb303. No fake release signal is written to the global release clock. Preview clock/session store and finish callback are isolated inside the authorized iframe. Hub shortcuts cover final5min/1min/30s/10s, full briefing, static/music and titles; Replay/Back/Fullscreen remain available.

Shared film modules/media/tests:39 identical hashes verified by main's `scripts/sync-launch-briefing-tests.mjs --check`. Existing character/avatar dependencies and underlying media match. Stranger model is the existing black hooded keeper; all dialogue uses his existing bm_george voice. Main static/music/title timing is preserved.

Verification:396/396 Node tests pass; production build passes with existing chunk advisories. Local authorized browser checks pass password entry, countdown→film, direct preview, static/music/title shortcuts, replay/back teardown and no automatic native fullscreen covering hub controls. Main has315 passing tests plus scene/player/countdown browser checks. Independent review found no blockers and verified clock/storage/password isolation. No Halloween gameplay/teaser behavior was changed by this patch.
