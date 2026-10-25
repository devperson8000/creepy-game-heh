# Halloween sound pass

User approved all five previously recommended Mixkit sounds for the upcoming update. Keep the public map-only production branch unchanged.

Needlelimbs: a very quiet, low-pass heavy breath during the approach, followed by a stronger short breath immediately after the survivor finishes speaking and before withdrawal. Both are stereo-positioned toward the same right-hand corridor as the actor; use the existing teaser audio-clock schedule, late-load offsets, mute and pause/disposal lifecycle. B2 monitor, replay and tester use this same shared playback code.

Basement: intermittent 12-second room-dread passages on a 43-second cycle and 7-second vent swells on a separate 57-second cycle, leaving large quiet gaps. Stereo direction responds to camera yaw. Soften the new layer during hunting danger, hiding and the established pre-six hush. Normal runs never instantiate or fetch the update sample bank.

Archive: a short interference accent at the monitor switch and rare quiet static in the walkable archive; mute it during the film/dialogue presentation. Pause, visibility changes, leaving B2 and scene disposal stop active samples. Decoding never queues a stale sound after disposal.

Five official WAV sources converted offline to local mono MP3s, with source IDs, hashes, licence and conversion details retained. Total additional media is approximately 1.9 MB. No external audio host is contacted by players.

Validation: full test suite, production build, browser decode/playback of all five clips, normal-game isolation, pause/stop cleanup, and shared teaser replay checks. Deploy only the Halloween feature/test branch.

## Main sound-pack publication

The user explicitly requested pushing these sounds to main. Main carries the five approved assets and the shared sample-bank/soundscape helpers; normal gameplay still uses createRoomAmbience() with halloween=false, so it never fetches the update samples. Complete B2/Needlelimbs cue integration remains active on the Halloween tester branch and will ship with that update. No other seasonal gameplay, model, intro or teaser is added to the current public game by this sound-pack commit.
