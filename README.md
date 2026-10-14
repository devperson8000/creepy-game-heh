# Creepy Game — The Watcher

A browser scene of a smooth black horned humanoid with idle and running animations. Built with Three.js and Vite. The creature is reconstructed from a reference image, with approximated unseen surfaces; it is not the original Roblox or Sketchfab asset.

## Development

Node.js 22.12+ or 24 recommended.

```sh
npm ci
npm run dev
```

In a restricted cloud workspace, use `npm ci --cache /tmp/creepy-npm-cache` if the default npm cache is not writable. Use the existing checkout; no extra worktree is needed.

```sh
npm test
npm run build
npm run preview
```

The scene requires a browser with WebGL. All runtime assets are bundled locally; no external model service, account, or secret is needed.

## Controls

Click the scene to capture the mouse. Use **WASD** or the arrow keys to walk, the **mouse** to look, and **Shift** to move faster. **Escape** releases the mouse. Click **See him run** or press **R** to toggle running in place; press R again to return to idle. The crosshair is a small white dot. On touch devices, drag the scene to look and use the arrow buttons to walk.

## Vercel

Import `devperson8000/creepy-game-heh` from GitHub into Vercel. Select the **Vite** preset, use `npm run build`, and set output to `dist`. Set production branch to `main`. Subsequent pushes to main trigger deployments through the GitHub integration.
