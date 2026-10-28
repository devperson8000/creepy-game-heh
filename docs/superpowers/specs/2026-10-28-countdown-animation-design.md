# Halloween timer animation

The user approved earlier, more intense timer animations and fullscreen, then explicitly deferred the character/cinematic animation: implement the timer only. Keep October 31, 2026 at 4 PM Australia/Sydney. Do not build a new character, lunge sequence or cinematic reveal.

Use the existing confirmed server clock. Five minutes before release, strengthen the pumpkin glow/embers and dim only the hallway background. At one minute, intensify the timer pulse and optionally add generated heartbeat/low ambience. At thirty seconds, open a fullscreen-sized timer dialog once for a visitor who has not dismissed it. A normal button also opens the timer at any time and requests native browser fullscreen from that gesture. Closing it restores the menu and prevents unwanted reopening during the countdown event. At zero, hold 00:00 with a simple completion message and explicit refresh/back controls; no character or reveal sequence.

Audio is explicitly enabled by a button, respects saved game volume, pauses when the tab is hidden, and stops/disposes with the menu. Reduced motion removes pulses, ember movement and light variation while keeping readable timer states and optional fullscreen. Existing Monochrome hallway movement is preserved; pause its renderer while covered by the timer.

The timer exists only on the Singleplayer/Multiplayer choice screen. It must never interrupt gameplay, a lobby/waiting room or an active co-op session. Reuse the countdown's existing dispose lifecycle. Unknown server time must not trigger effects or completion. Preserve the main game, microphone hearing and all seasonal gameplay/teaser gates. No public test buttons or artificial time controls.

The fullscreen dialog must fit phones, retain readable digits, have labelled sound/fullscreen/close controls, trap focus, support Escape, restore focus/inert state on close and exit only fullscreen it owns. Native fullscreen failure still leaves a usable immersive timer. Session storage failures must be harmless. Reopening the menu or resynchronizing the clock must not create repeated auto dialogs.
