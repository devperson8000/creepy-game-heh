# Halloween sound polish — 26 October 2026

The existing five licensed clips remain unchanged. Refine their playback rather than adding constant noise: 2.2-second room swells, 1.4-second vent swells, existing quiet gaps, smooth stereo movement as the camera turns, and equal-power attenuation of the ambient bus when passages overlap. Danger, hiding and the pre-hunt hush still take precedence.

Fix long-session excerpts wrapping within the available recording so complete passages play rather than fragments clamped to the final 100 milliseconds. Freeze ambience time while its AudioContext is suspended. Do not restart an existing passage to update stereo direction; avoid redundant volume automation.

In the shared Halloween teaser, retain the quiet, muffled approach breath and give the post-dialogue exhale a 120 ms attack and 320 ms release. Finish at 8.45 seconds, before Needlelimbs withdraws at 8.65. Slightly soften its gain and upper frequencies. The B2 monitor, replay and tester all use the same audio-clock cue definitions. Original Monochrome recordings and synchronized arrival title hit remain unchanged.

## Release boundary

Only the shared optional ambience helpers and regression coverage are staged on main. Public gameplay still uses the default non-seasonal mode and does not request these sounds. The enabled seasonal mix and teaser polish deploy on the Halloween tester branch.

## Verification

Regression tests cover long-session excerpts, smooth pan without restart, suspended-clock behavior and overlap headroom. Browser checks decode and play all five actual MP3s, inspect the scheduled exhale envelope, render overlapping ambience offline, and verify quiet starts, clean tails, pause/disposal and standard-game isolation. Run the complete test suites and production builds on both branches before pushing.
