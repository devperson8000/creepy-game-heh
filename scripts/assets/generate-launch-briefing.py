#!/usr/bin/env python3
"""Rebuild the local, original narration and lossless uploaded launch score.

Run with /workspace/creepy-game-heh/work/teaser-tts/venv/bin/python.
Requires the existing local Kokoro model/voices and ffmpeg; no online service.
"""
import hashlib
import json
import pathlib
import subprocess
import tempfile
import wave

import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/audio/launch'
SOURCE = pathlib.Path('/workspace/attachments/25ce7b43-8ef5-443f-af26-e175054dde3c/John Carpenter - The Shape Hunts Allyson.mp4')
MODEL = pathlib.Path('/workspace/creepy-game-heh/work/opening-tts')
LINES = [
    ('welcome', 2, "Welcome back. We've made a few improvements.", .95),
    ('pumpkins', 9, 'Mostly pumpkins. The other problems remain.', .95),
    ('inviting', 18, 'We wanted somewhere warm. Inviting. Somewhere you could bring a friend.', .96),
    ('friend', 28, "Perhaps a friend you're not particularly attached to.", .95),
    ('proximity', 36, 'Stay close if you want to hear each other.', .96),
    ('alternative', 43, 'Although some of you may consider the alternative an improvement.', .96),
    ('hidden', 53, "There's also something hidden for the observant among you.", .95),
    ('doors', 61, 'Follow the clues. Keep your reward. And please remember which doors you open.', .96),
    ('secret', 73, "No. We're not showing them that part.", .96),
    ('management', 82, 'Finally, management would like to remind you—', .97),
    ('panic', None, 'Oh crap. Cut the cameras', 1.16),
    ('now', 94, 'NOW!', .96),
]


def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *map(str, args)], check=True)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ffmpeg('-i', SOURCE, '-map', '0:a:0', '-c:a', 'copy', '-vn', '-movflags', '+faststart', OUT / 'score.m4a')
    metadata = probe(OUT / 'score.m4a')['streams'][0]
    pcm = np.frombuffer(subprocess.check_output(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(OUT / 'score.m4a'), '-f', 'f32le', '-ac', '1', '-ar', '44100', '-']), dtype='<f4')
    # Selected from the first major bass entry and the following measured
    # percussion attacks. 1ms-hop positive spectral flux, 1024-sample Hann
    # window; timestamps compensated to the centre of that window.
    score = {
        'url': '/audio/launch/score.m4a',
        'duration': len(pcm) / 44100,
        'containerDuration': float(metadata['duration']),
        'accents': [10.690340, 12.025306, 13.382222],
        'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'extractedSha256': hashlib.sha256((OUT / 'score.m4a').read_bytes()).hexdigest(),
        'sourceName': SOURCE.name,
        'codec': 'aac', 'sampleRate': 44100, 'channels': 2,
        'extraction': 'ffmpeg -map 0:a:0 -c:a copy -vn -movflags +faststart',
        'analysis': {'method': 'positive log-magnitude spectral flux; 1024-sample Hann; hop44; centre corrected',
                     'flux': [23.566, 12.321, 7.584],
                     'firstBassEntryRmsBefore': .091, 'firstBassEntryRmsAfter': .451,
                     'rmsWindowSeconds': .01},
    }
    (OUT / 'score.json').write_text(json.dumps(score, indent=2) + '\n')
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(MODEL / 'kokoro-v1.0.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
    engine = Kokoro.from_session(session, str(MODEL / 'voices-v1.0.bin'))
    clips = []
    with tempfile.TemporaryDirectory(prefix='launch-briefing-') as tmp:
        for name, start, text, speed in LINES:
            samples, rate = engine.create(text, voice='am_michael', speed=speed, lang='en-us', sentence_pause=.24, clause_pause=.14)
            # Strip model padding, leave a short clean onset, and apply a dry
            # broadcast EQ/limiter. Panic is faster; NOW gets added presence.
            active = np.flatnonzero(np.abs(samples) > .003)
            if len(active):
                samples = samples[max(0, active[0] - int(rate * .012)):min(len(samples), active[-1] + int(rate * .055))]
            wav = pathlib.Path(tmp) / (name + '.wav')
            with wave.open(str(wav), 'wb') as handle:
                handle.setnchannels(1)
                handle.setsampwidth(2)
                handle.setframerate(rate)
                handle.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())
            filters = 'highpass=f=70,lowpass=f=11200,loudnorm=I=-17:TP=-2:LRA=7,afade=t=in:d=0.006'
            if name == 'now':
                filters += ',atempo=2,atrim=duration=0.3,afade=t=out:st=0.275:d=0.025,equalizer=f=2100:t=q:w=1:g=3,volume=1.12,alimiter=limit=0.89'
            target = OUT / (name + '.mp3')
            ffmpeg('-i', wav, '-af', filters, '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', target)
            # The decoded duration drives scheduling, avoiding encoder-padding
            # discrepancy in a separate cue back-timed to finish at 94.
            raw = subprocess.check_output(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(target), '-f', 'f32le', '-ac', '1', '-ar', '24000', '-'])
            duration = len(raw) / (4 * 24000)
            clips.append({'id': name, 'url': '/audio/launch/' + name + '.mp3', 'start': 94 - duration if start is None else start, 'duration': duration, 'text': text})
            print(json.dumps(clips[-1]), flush=True)
        # Short, filtered, deterministic television hiss: no giant loop asset.
        rate = 24000
        rng = np.random.default_rng(3110)
        noise = rng.uniform(-.42, .42, int(rate * 2.1))
        noise[1:] -= .6 * noise[:-1].copy()
        wav = pathlib.Path(tmp) / 'static.wav'
        with wave.open(str(wav), 'wb') as handle:
            handle.setnchannels(1); handle.setsampwidth(2); handle.setframerate(rate)
            handle.writeframes((noise * 32767).astype('<i2').tobytes())
        ffmpeg('-i', wav, '-af', 'highpass=f=480,lowpass=f=7800,volume=0.5', '-c:a', 'libmp3lame', '-b:a', '96k', OUT / 'static.mp3')
    (OUT / 'dialogue.json').write_text(json.dumps({'voice': 'am_michael', 'clips': clips}, indent=2) + '\n')


if __name__ == '__main__':
    main()
