# Slower chase, belly landing, frequent sightings and longer rescue

The main menu starts its first crossing after 0.8–2 seconds, then starts later crossings roughly every 2.2–4.2 seconds. The creature still disappears behind the junction walls. Reduced motion suppresses the crossings.

The finale stays at 30 seconds with the same chase shot duration. Corridor travel drops from 5.76 to 3.24 world units per playback second by shortening the approach distance; the runner and creature stride animations play at 55% of the preceding cadence. Running footsteps follow that cadence. The stairs, door struggle, ascent and ending retain their shot boundaries.

The runner now extends forward during the airborne dive and lands face-down on the left side of the cab. The final fall pose is held through the door struggle, ascent and fade, then reversed into a stand-up only at the surface walkout. Sampling is absolute, so replay and network catch-up reproduce the same pose. The sole remaining survivor also stays down; the doors close automatically in that case. Other survivors keep clear of the prone lane, and the dive camera looks down that lane to avoid their blocking the landing in a four-person cast. The stand-up joins the walking clip without a one-frame fall at the boundary.

Downed teammates now have **45 seconds**, increased from 12, to receive a rescue. The existing 2.5-second hold to rescue is unchanged. The authoritative deadline, replicated countdown and downed-screen explanation agree. Team wipes still end immediately. Blocked drawer attempts no longer emit the obstruction toast; distance and visibility validation remain active.

## Verification

- `npm test`: **203 passed, zero failures**. Regression tests cover slower corridor speed with unchanged shot completion, airborne forward extension, prone head/hips above the cab floor, holding the pose through ascent for 1/2/4-person casts, deterministic seeking, standing at the exact walk boundary, late rescue, exact expiry and silent blocked drawers.
- `npm run build`: passed. The existing Three.js chunk-size advisory remains.
- Full 30-second production preview: passed winning titles, replay, 2/3/4 casts, mute, phone layout, Escape, repeated menu returns and model-download failure/retry, without browser runtime errors.
- Two authenticated clients on the production preview: passed actual victory triggering, hidden HUD, synchronized finale clocks (2.286 / 2.246 seconds), hidden-host progression, large-seek catch-up, mute controls and final authoritative victory over database fallback.
- New `npm run test:browser:coop-rescue` against the Vite development server: passed a real cabinet opening from the front, an occluded attempt leaving notice count unchanged, 45-second deadline replication to the guest HUD, and a successful rescue after advancing authority time by 30 seconds. The fixture disables GPU drawing after startup and forces database fallback; state, visibility and transport remain real.
- Rendered desktop and portrait shots inspected for the airborne dive, face-down landing, door interaction, ascent, floor hold, get-up and walkout, including the four-person cast and the sole remaining survivor.
- Menu observation recorded crossing starts at 1.458, 4.381, 7.381 and 11.480 seconds. The scratch observer instruments the render call and reduces pixel density without changing scheduling.

Test harness corrections during verification: the downed-screen check now waits for the capture animation to finish before reading its text, and Chrome focus emulation keeps both clients visible as on separate devices. A Vite reload during scratch HTML creation interrupted one run; the clean rerun above passed. These checks do not establish frame rates on every device or transport performance on every network.
