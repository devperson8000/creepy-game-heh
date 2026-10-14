# Creature scene implementation plan

Approved design: ../specs/2026-10-14-creature-scene-design.md.

Execution: implement inline in the existing isolated checkout; no subagents or additional worktrees.

## 1. Browser project

Create package.json, a committed npm lockfile, index.html, .gitignore, and src/main.js using Three.js and Vite. Add development, build, preview, and test commands. Use a full-window canvas with a readable WebGL failure message. Keep dependency versions fixed by the lockfile.

## 2. Creature and idle motion

Create src/creature.js with articulated groups for the torso, head, arms, and stationary legs. Construct black angular geometry matching the reference silhouette and two small white eyes with dark centers. Reconstruct unseen surfaces conservatively.

Create src/idle.js to compute a bounded pose from elapsed time. Write and run tests in tests/idle.test.js before implementing motion: verify torso sway and head direction change over time, finite bounded rotations, and a stationary root. Apply the pose to the articulated creature every frame; avoid cumulative transforms and keep feet planted.

## 3. Scene presentation

Create src/scene.js and src/style.css. Place the creature in a dim gray room with a fixed camera framing its full silhouette. Use restrained lighting, shadows, and atmospheric fog. Update the camera and renderer when the viewport changes and cap pixel density. Do not add gameplay controls, menus, audio, or objectives.

## 4. Validate

Run npm test and npm run build. Start the app and perform a browser smoke check at desktop and mobile sizes: verify the canvas renders, eyes and silhouette are visible, motion changes over time, and there are no application console errors. Inspect a captured frame and adjust proportions and lighting to match the supplied reference. If browser tooling is unavailable, report visual validation as unverified rather than substitute a build check.

## 5. GitHub and Vercel

Write README.md with development commands and Vercel's Vite configuration (npm run build, output dist). Check repository status and commit the implementation. Confirm the remote state before pushing to main so existing work is preserved. Push through the existing GitHub authentication if permitted and available.

Use an available authenticated Vercel integration to connect the GitHub repository and deploy. If none is available, finish and verify local work and GitHub storage, then report the exact remaining Vercel import step. Do not request credential values in chat or claim a deployment without a confirmed result.

## Completion evidence

Report test and build results, visual validation status, GitHub commit/push status, and the confirmed deployment URL or specific deployment blocker separately.
