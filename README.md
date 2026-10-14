# Creepy Game — The Watcher

A browser scene of a black humanoid standing, swaying, and looking around. Built with Three.js and Vite. The creature is reconstructed from a reference image, with approximated unseen surfaces; it is not the original Roblox or Sketchfab asset.

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

## Vercel

Import `devperson8000/creepy-game-heh` from GitHub into Vercel. Select the **Vite** preset, use `npm run build`, and set output to `dist`. Set production branch to `main`. Subsequent pushes to main trigger deployments through the GitHub integration.
