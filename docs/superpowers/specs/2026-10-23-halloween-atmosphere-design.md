# Halloween atmosphere polish

Make the upcoming update feel like one authored haunted-party experience: reuse the opening house’s pumpkins, webs, warm bulbs and paper decorations in B1, add richer candles, lanterns and room dressing, and give the countdown a truthful preview of the deeper maze, hidden key and B2 archive. The user has delegated design choices and implementation without further approvals.

Use the existing Three.js implementation and locally authored geometry. A shared prop factory supplies both the opening and map, with a weathered palette for B1. Replace the old scaled-down room dressing with deliberate placements in each room’s doorway orientation. Keep floor props beside the cabinet, wall props flush to solid walls, and the entire descent clear. Use a fixed pool of three small warm lights rather than adding one light per decoration. Candle flicker and paper sway are subtle and stop with reduced motion.

The chosen approach is shared procedural models plus a seeded placement planner. Copying house geometry into the map would preserve the current duplication; downloading an unrelated asset pack would add load time and another visual style. No extra packages, remote model downloads or new level are needed.

Keep all three drawers per cabinet usable, closet grilles stationary and visible, and every quest item and code readable. Raise the code clear of the taller cabinet and mount room numbers on the doorway frame. Polish the quest chest with a real lid, chain movement and a smooth key lift. Add a password-authorized opening preview to the existing test hub.

Preserve walk/sprint/chase 4.6/6.2/5.5 m/s, stamina 8/1.1/6 seconds, all multiplayer IDs and host authority, B2/finale coordinates, original monster audio, the two-second intro skip, and the October 31 2026 4 PM Sydney server release. Normal pre-release gameplay stays unchanged apart from anticipation copy. Review the whole change with seeded geometry tests, actual E interactions and screenshots in the browser.
