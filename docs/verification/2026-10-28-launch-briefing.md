# Halloween launch briefing verification

Scope: approved narrated mini-show and user-supplied audio ending, gated by the existing October 31, 2026 16:00 Sydney release signal. Main gameplay, difficulty, original creature and release deadline are unchanged. No Halloween tester or new creature is exposed on the normal menu before release.

Audio extraction preserves all 2,499 AAC packet hashes. Decoded duration is58.0266667s; metadata and analysis are in docs/audio/2026-10-28-launch-score.md. Three actual bass/percussion accents at10.690340,12.025306,13.382222s drive HALLOWEEN/HAS/ARRIVED from the same media clock. Narration is generated from individual measured clips; NOW begins at94 with static. Static/noise fully fade by96.1; score begins96.25 after a silent black gap.

- `npm test`: 310 tests pass, including clock/autoplay/mute/resume/disposal, timeline/caption boundaries, gate rules, real skeletal gait sampling, and existing gameplay regressions.
- `npm run build`: passes. Existing main/Three chunk-size advisory remains; briefing scene/player code is a separate lazy chunk.
- `scripts/check-launch-briefing-scene-browser.mjs`: desktop/portrait/ultrawide scene frames, actual animated hazmat rig, deterministic reduced-motion frames, failed/late models, and repeated disposal pass.
- `scripts/check-launch-briefing-player-browser.mjs`: records actual score BufferSource timing against DOM title mutations; measured0/0/0ms in a completed Chromium run (display frames may vary on other hardware). Static→black→music, four viewports, skip/entry resource cleanup, missing-media/WebGL fallback pass.
- `scripts/check-countdown-animation-browser.mjs`: confirmed release crossing, once-only briefing, replay, dismiss/reload guard, native/manual fullscreen, focus trap/restoration, footer clearance on desktop/phone, hidden crossing, unknown clock fail-closed and gameplay disposal pass.
- `scripts/check-public-sound-gate-browser.mjs`: ordinary menu→solo still uses the balanced45-cell plain map, no seasonal run and no launch/update audio requests.

Independent review findings addressed: hidden-tab delayed auto-start (including throttled intervals), pending preload after close, skip focus, footer grid and overlap, title shift on CTA reveal, and missing NOW subtitle. Controls remain available without audio/WebGL. Browser fixtures are development scripts, excluded from Vite production output.

Production verification is recorded below after publishing.
