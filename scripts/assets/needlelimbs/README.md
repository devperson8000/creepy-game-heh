# Supplied Needlelimbs textures

Extracted directly from the user's textures.docx, uploaded 25 October 2026:

- word/media/image3.jpeg -> base-color.jpg (sRGB)
- word/media/image1.jpeg -> roughness.jpg (linear)
- word/media/image2.png -> height.png (linear)

All supplied images are 1380 by 1380. normal.png is derived from height.png using the script below, with a restrained microdetail strength; no source texture is painted or replaced. Blender's importer script embeds color, roughness, and normal in the GLB. Runtime loading does not require these source files.

Regenerate normal.png with Python, Pillow and NumPy:

```python
from PIL import Image
import numpy as np
h = np.asarray(Image.open('height.png').convert('L'), dtype=np.float32) / 255
vertical, horizontal = np.gradient(h)
n = np.stack((-horizontal * 3, vertical * 3, np.ones_like(h)), axis=-1)
n /= np.linalg.norm(n, axis=-1, keepdims=True)
Image.fromarray(np.uint8(np.clip(n * .5 + .5, 0, 1) * 255)).save('normal.png')
```

See public/models/teaser/CREDITS.md for the model's attribution. These images do not inherit the other teaser models' CC0 license.
