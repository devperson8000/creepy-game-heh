# Pitfall gameplay implementation

Approved scope: implement the previously researched counterbalance, real far-side passage and lower house escape route in solo and cooperative Level 0. Preserve the empty replacement Bacteria slot and user-provided hazmat choice.

1. Add deterministic per-player beam instability and Q/E counterbalance, with physical slips into openings; verify uncontrolled fall, successful correction, intersections, collision and resets.
2. Carry lean/crouch through authenticated cooperative commands without breaking original Monochrome input compatibility; validate migration and packet replay.
3. Implement F interaction, Ctrl crouch and mouse flashlight use, balance feedback and touch controls. Require crouching at actual vents; prevent host-side bypass of disabled targets.
4. Build lower blue kitchen/dark flashlight room/stair hall, collision from the same layout, arrows and physical far white corridor. Verify both complete exit routes and rope rescue.
5. Run all unit tests, build, solo and real two-tab browser checks; review and deploy the authorized main update.

Interfaces: balance lives on player and steps before gravity in solo and co-op; movement inputs add optional lean/crouch; house exports PITFALLS vent/flashlight positions and shared collision geometry; lighting samples accept colors.

Review focus: disabled vent bypass, rejected legacy input packets, unsafe slip movement through walls, house stair side-climbing, replay/reset retaining balance, keyboard/touch interactions, remote crouch visibility.

Source limits: community wiki and Steam walkthrough establish qualitative mechanics, not original source code or exact tuning/dimensions. No claim of an exact commercial map/physics copy.

## Verification and review

Completed all five tasks. Full suite: 502/502 passed. Production Vite build passed with existing chunk-size/import warnings. Complete solo browser check passed: four scattered pickups, four assembly stages, ladder/key/door, rope pickup, real balance fall, lower door, flashlight, physical stairs/hall vent, replay, physical upper corridor/crouched vent, mobile and disposal. Real Supabase two-tab check passed lobby/admission/start, host-acknowledged movement, shared pickups/build, proximity rejection, rope rescue, restart, team exit and cleanup. Peer chat remained in its existing pending connection state in this browser environment; gameplay uses authenticated RPCs independently.

Production backward-compatible optional lean/crouch migration applied; rollback SQL suites for posture, movement, microphone and permissions passed without persistent fixtures. Fresh code review found the raised-hall light threshold (fixed) and a perimeter carpet bypass. Closed the bypass with visible shared-layout walls and extended balance to the outer half of boundary beams; regression tests proved both original bypasses fail and edge slips reach real openings. The first solo browser staircase fixture was angled off the stair side; reproduced and corrected its camera approach, then reran the complete route successfully.
