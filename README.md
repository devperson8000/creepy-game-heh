# MONOCHROME — browser escape game

A first-person monochrome horror escape game built with Three.js and Vite. Uses the creature developed in this repository and the documented escape loop from [monochromegame.wiki](https://monochromegame.wiki/walkthrough/).

## Play

Open the boarded **DO NOT ENTER** doorway in the elevator lobby. Descend the return stairs, search dresser drawers for **four keys**, and read the **four-digit note** in the basement. Hide in closets when the moving creature approaches. Return upstairs, bank the keys at the four-lock panel, enter the number at the separate keypad, then open the elevator and walk inside.

Key locations, basement corridors, and the four-digit number vary between runs. Banked keys and an accepted code survive a retry. Unbanked keys return to their original drawers when you are caught. The clue is recorded in the HUD after you read it. Leaving a searched drawer open helps track progress.

- **WASD / arrow keys:** move.
- **Mouse:** look; click the scene to capture it.
- **Shift:** run.
- **Hold E:** interact, search, collect, bank keys, or hide/leave a closet.
- **Escape:** pause or close the keypad.
- On touch devices, drag to look, use the arrow pad to move, and hold the interaction button.

The original creature animation viewer remains available through **Creature study** on the title screen, or `?mode=study`. There, the button or **R** toggles running in place.

**Monster sound is intentionally absent**, pending the supplied sound file. Monster distance and visibility are calculated separately in the enemy system for the future audio integration.

## Reference boundaries

The wiki documents the boarded doorway, upstairs elevator hub, stairs, basement furniture searches, closets, four keys, a run-specific four-digit clue, and two separate elevator lock systems. See [route map](https://monochromegame.wiki/route-map/), [keys](https://monochromegame.wiki/keys-and-code/), and [code](https://monochromegame.wiki/code/). These pages were read on October 14, 2026.

The wiki explicitly does not confirm an exact basement floor plan, fixed key spawns, current-build control bindings, or detailed monster AI. This browser version supplies its own connected maze, collision, patrol/chase behavior, visual danger cues, controls, menus, and retry system around the documented route. It does not claim to reproduce unverified Roblox internals or Part 2. All scene assets are locally generated; no external asset service or account is required.

## Development

Node.js 22.12+ or 24 recommended.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

In a restricted cloud workspace, use `npm ci --cache /tmp/creepy-npm-cache` if the default npm cache is not writable. Use the existing checkout; no extra worktree is needed. A WebGL-capable browser is required.

## Vercel

Import `devperson8000/creepy-game-heh` from GitHub into Vercel. Select the **Vite** preset, build with `npm run build`, output **dist**, production branch **main**. The included `vercel.json` supplies the build settings. Subsequent pushes trigger deployment once the GitHub integration is connected. No backend or secrets are needed.
