# Creepy creature scene

## Goal

Create a browser game whose initial scope is a single creature standing in place with an idle animation. Match the user's supplied MONOCHROME image as closely as practical: an almost black humanoid, angular broad shoulders, narrow elongated head and neck, long hanging arms, separated legs, and two small white eyes. The image is the visual reference; the original model is unavailable. Unseen surfaces and exact proportions must be approximated rather than claimed as an exact reconstruction.

## Approach

Use Three.js with Vite to render a locally constructed 3D creature. This avoids a blocked external asset download and allows independent motion of the head, torso, and arms. An external model would require a usable asset; a flat image would not support convincing head turns. Keep geometry and materials in a creature module, scene lighting and camera in a scene module, and idle motion in an animation module.

## Presentation and behavior

Show the full creature from a fixed frontal camera in a restrained gray, dim room. Background lighting must separate the black silhouette from its surroundings. Eyes remain small and white. Prioritize matching the reference over adding interface decoration.

The creature stays at its starting location. Animate gentle upper-body sway, subtle arm movement, and slow head turns left and right with brief pauses. Feet stay planted. The scene starts automatically, resizes for desktop and mobile, and caps pixel density to limit rendering cost. No movement controls, enemies, objectives, audio, or menus are included in this initial version.

## Reliability and validation

Use elapsed time for frame-rate-independent motion. Present a readable message if WebGL initialization fails. Verify animation remains bounded and does not translate the creature across the room. Run the production build and a browser smoke check for successful rendering, visible creature, responsive sizing, and motion without console errors. Visually inspect the silhouette against the supplied image.

## Storage and deployment

Store the project in devperson8000/creepy-game-heh on GitHub. Vercel should build with npm run build and serve dist using its GitHub integration. No backend or application secrets are needed. Deployment and GitHub push are only reported successful after actual confirmation; missing platform access is reported separately from local implementation.
