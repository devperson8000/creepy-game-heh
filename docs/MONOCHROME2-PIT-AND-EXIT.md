# Monochrome 2: the pit room, the dark route and the exit

This supersedes the pit/exit parts of `MONOCHROME2-GAMEPLAY-READY.md`. Everything here is covered by tests that run
without a browser; what the scenes *look* like has not been seen by a human yet (see "Verification").

## Who is where
| Place | Bacteria | Monochrome |
|---|---|---|
| Normal Level 0 (west of the pit door) | main hunter, from 180 s | rare: at most two 40-55 s visits |
| Pit room beams (upper layer, east of the door) | never | never |
| Dark lower layer under the pits | never | patrols from the moment the pit door opens; slower (x0.74), shorter sight (x0.6) |

The lower Monochrome never enters the stairwell (a safe zone) or the west house. Noise made east of the pit door is
ignored by the maze monsters, and noise on the lower layer is only heard by the lower Monochrome. Landing in the dark
makes a 14 m noise only he hears.

## The pit room
* Both doors (pit door at x=42, exit door at x=74) are rebuilt to fill their doorway with a 2 cm reveal, inside a
  casing, under a lintel. Opening the pit door swings it into the room and the ceiling lights come on in a flickering
  sweep from the door, so the grid is revealed.
* Crossing is hard: tilt drifts, gusts shove, moving shakes you, time on the beams adds fatigue, sprinting is impossible on
  beams. `PIT_BALANCE` in `src/backrooms-balance.js` holds the values, calibrated with simulated players: hurrying
  or doing nothing fails, a careful crouch-walk by a good player gets across about half the time (see
  `tests/backrooms-balance.test.js`).
* A fall lands on open floor (fixed: it could previously land you inside a column's collision zone and pin you).

## The dark route
* The lower layer has no lights. Glowing arrows (`backrooms-lower-route.js`) point along the real shortest walk to the
  foot of the stairwell, which climbs onto the east landing beside the exit door. The old west alternate vent no longer
  ends the round.
* A supply room in the middle of the layer holds the flashlight (still the placeholder torch: the supplied .fbx was
  not in the repo). A faint green lamp marks its door. Battery: 60 s of beam, flickers from 25%, dead at 0.
* Wall baffles lengthen the route; every fall site has a route to both the flashlight and the stairs.

## Exit: door, button, vent, next level
1. Open the exit door. The passage beyond is exactly as wide as the doorway.
2. Hold F at the release button on the south wall. First-person cutscene: your left hand presses it, you step up to the
   vent and kneel, and the same hand pushes the grate open (`buttonSequence`, 4.5 s, input locked).
3. Hold F at the vent. You crawl through the shaft (`crawlSequence`), the screen fades to black and fades up on the
   next-level peek, then the round ends. `src/next-level-peek.js` is a deliberate PLACEHOLDER.
In co-op every survivor plays their own sequence; the round is won when the last one is through.

## Rope
A rescuer on a beam holds F to lower the rope: an anchor bar clamps to the beam and juts over an opening, the rope
unrolls and settles, and a glow stick at its foot makes it findable in the dark. The fallen player walks to it (must be
within 1.9 m, over open floor), then climbs hand over hand, lifts above the beam and slides onto it
(`monochrome2-rope.js`). The body never enters a shaft wall (tested at 120 Hz).

## Downed pose
Monochrome leaves you flat on your back, the Bacteria curled on your side. A ring around the body empties as the
bleed-out timer runs, and a crouched friend leans in. Getting up after a revive is slower than falling.

## Verification
`npm test` (uses real three.js). Headless without three, `scripts/dev/` has a stand-in used to smoke-test the pit view:
`node --import ./scripts/dev/register-three-stub.mjs your-script.mjs`.
