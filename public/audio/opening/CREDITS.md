# Monochrome opening dialogue

Original game dialogue, synthesized offline with [Kokoro-82M v1.0](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0 licensed model), using the `am_michael` synthetic voice via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx). No person's voice was cloned for this game. The model card lists its training-data acknowledgements, including [Koniwa](https://github.com/koniwa/koniwa) (CC BY 3.0) and [SIWIS](https://datashare.ed.ac.uk/handle/10283/2353) (CC BY 4.0).

- `hello.mp3`: “Hello? Is anyone here?” Speed 0.98.
- `music.mp3`: “I could've sworn I heard music.” Speed 1.0.
- `wall.mp3`: “That's... not possible.” Speed 0.96.
- `where.mp3`: “Where am I?” Speed 0.96.

Speech uses a short sentence/clause pause (0.18/0.12 seconds), a gentle high-pass at 65 Hz and low-pass at 11.5 kHz, loudness normalization to -17 LUFS / -2 dBTP, and a 12 ms fade-in. Files are mono 24 kHz / 96 kbps MP3. The runtime adds a subtle short room response, leaving a clear direct voice, and respects the player's volume setting and browser autoplay requirements. Only these small finished recordings ship; speech models and inference tooling do not.

All other opening sounds are synthesized by `src/opening-audio.js`. Existing monster sounds, the finale and the teaser's metallic effect are unchanged.
