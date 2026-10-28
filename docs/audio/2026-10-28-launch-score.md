# Launch briefing audio — 28 October 2026

The briefing owns a separate Web Audio graph and uses its absolute film clock for sound and picture. The graph is constructed only by the lazily loaded, gated briefing. Existing arrival, title and monster assets are unchanged.

## Uploaded score and measured accents

Source: `John Carpenter - The Shape Hunts Allyson.mp4` supplied for this update.

- Source SHA-256: `cae10d156b5b4d2530b73a2f80d2ecc7f51ba5fd53461e52e8d631f83b065fa2`.
- Extracted `score.m4a` SHA-256: `2c0b7c89d70c5143774f997ff7352b12ac09421d4ef7c3885281d2f5abada073`.
- Extraction: `ffmpeg -map 0:a:0 -c:a copy -vn -movflags +faststart`. Stereo AAC-LC, 44,100 Hz, approximately 128 kbit/s. No re-encoding.
- Packet preservation checked with `ffprobe -show_packets -show_data_hash sha256`: all **2,499 AAC packet hashes match** the uploaded stream in order.
- Container duration is 58.060045 seconds. Actual decoded duration is **58.0266666667 seconds**, verified independently by ffmpeg PCM output and Chromium `decodeAudioData`. Scheduling and the end fade use the decoded duration.

Accents were measured on the extracted file's mono PCM decode at 44,100 Hz using positive spectral flux of log-magnitude spectra, a 1,024-sample Hann window, a 44-sample (~1 ms) hop, and window-centre compensation. The opening has a thin synth pulse; the first large low-frequency entry is around 10.69 seconds. Ten-millisecond RMS rises from .091 just before that attack to .451 after it. The following two selected percussion attacks provide distinct word reveals rather than a beat timer.

| Word | Track time, seconds | Absolute film time | Local positive spectral flux |
| --- | ---: | ---: | ---: |
| HALLOWEEN | 10.690340 | 106.940340 | 23.566 |
| HAS | 12.025306 | 108.275306 | 12.321 |
| ARRIVED | 13.382222 | 109.632222 | 7.584 |

The score starts at film 96.25 and fades to its normal level over 1.5 seconds, completing well before the first selected accent. The full title's entry action becomes available at 111.632222. The complete score remains available through 154.2766666667, with a two-second tail fade.

## Narration and cut

All twelve cues are original local Kokoro `bm_george` synthesis: the existing hooded stranger’s restrained British narration, dry EQ and loudness normalization, separate small MP3 clips. Calm cue starts follow the approved spec at 2, 9, 18, 28, 36, 43, 53, 61, 73 and 82 seconds. No reverb or creature voice processing is added. `public/audio/launch/dialogue.json` records every line and its measured decoded duration.

The faster panic prefix “Oh crap. Cut the cameras” starts at 92.394 and lasts 1.606, ending precisely at 94. Separate stressed **“NOW!”** begins at 94 and lasts .300 seconds, intentionally overlapping the first .300 seconds of TV static. It is speeded up and given a little presence for the interruption.

The familiar original `/audio/monster.mp3` supplies a quiet 2.6-second warning at 88–90.6, with .2-second edge fades and .18 gain. The file is reused as supplied; it is not altered. This is after the 82-second narrator cue and before the final panic prefix.

TV static is deterministic filtered noise generated locally; it runs at 94–95.2, fades to zero at 96.1, and has no overlap with the score. The 96.1–96.25 black gap is fully silent. The sound envelope is sample-scheduled, so a slow visual frame cannot move the cut or its fade.

## Runtime contract and verification

`createLaunchBriefingAudio({volume,createContext,fetchAudio})` exposes `ready`, `start({at,muted})`, `time`, `pause()`, `resume()`, `setMuted()`, `setVolume()`, `update()`, `dispose()`, `settled`, `hasAudio` and `running`. `LAUNCH_SCORE` and `LAUNCH_DIALOGUE` provide the same cue metadata to the visual timeline.

`start()` starts an immediately sampleable film clock before any asynchronous work. It prefers the audio clock and otherwise uses a monotonic performance clock. Autoplay resume waits at most 150 ms; if a gesture subsequently releases the pending resume, playback joins the current film offset. Asset loading settles within eight seconds and accepts partial successes. Muting stops sources while the film clock advances; enabling sound schedules only surviving portions of clips. Pause stops every source and freezes time, then resume schedules exact remaining offsets. Dispose aborts loading, settles blocked start work, stops/disconnects sources and closes the context.

The ten focused Node tests cover actual scheduler commands at static/song boundaries, seek offsets, muted catch-up, saved volume, frozen pause, asynchronous dispose, rejected and pending autoplay, asset timeout followed by disposal, bounded familiar monster cue, and packaged asset/cue integrity. A real headless Chromium check loaded this module through Vite, decoded all media, verified the NOW/static simultaneous starts at 94, score start at 96.25, zero pause drift, song-only scheduling from inside the silent gap, and closed-context disposal. Browser decode durations match the local PCM analysis, within a single output sample for MP3 resampling.

Rebuild with `/workspace/creepy-game-heh/work/teaser-tts/venv/bin/python scripts/assets/generate-launch-briefing.py` using the existing local model and voice files. The script does not use a remote speech service.
