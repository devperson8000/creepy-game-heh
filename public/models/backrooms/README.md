# Backrooms model import spaces

Drop the files here, then set `ready: true` for that entry in `src/backrooms-models.js`.

| File | Used for | Notes |
| --- | --- | --- |
| `hazmat.glb` (installed, ready) | Every player's suit (Level 0 and Monochrome 2) | Scaled to 1.8 m tall and centred on its feet. Facing +Z. A bone whose name ends in `head` is hidden in first person. Animation clips are matched by name: `idle`/`standing`, `walk`, `run`/`sprint`. |
| `bacteria.glb` | The bacteria, Level 0's main monster | Scaled to 2.6 m tall. Reserved: it is not simulated or drawn until its behaviour is built. Spawns on the lower layer. |

Until a file is marked ready, nothing is requested and nothing stands in for it. The metal-head Monochrome has its own slot (`MONOCHROME_SLOT.modelUrl` in `src/monochrome2-entities.js`).
