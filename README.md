# Nora & Reagan's Pixel Arcade

Version 1.1.0 is a polished, installable HTML5 arcade designed for two children sharing a Google Pixel 7. It uses only HTML, CSS, Canvas, and vanilla JavaScript—no account, server, API key, ad network, build step, or runtime dependency.

## Bubble Blast Duo

Bubble Blast Duo is the first complete game in the arcade:

- Solo, cooperative, and competitive play
- A 60-second Classic format and three-round Tournament format
- Chill, Classic, and Turbo difficulty
- Simultaneous pointer tracking with strictly isolated player zones
- Mirrored bubble type, size, speed, and position patterns in Versus
- Escalating spawn speed, five-step combo multipliers, and accuracy bonuses
- Bonus, Blast, ×2 Boost, and Slow Time bubbles with symbols and unique outlines
- Shared team goals and score rewards in Co-op
- Medals, round recaps, clear winners, retry, pause, and safe arcade return
- Procedural pop, combo, countdown, power-up, and celebration sounds
- Optional low-volume procedural music generated with Web Audio

The dashboard, editable profiles, trophies, statistics, accessibility settings, backup/restore, offline installation, and Coming Soon cards remain intact.

## Try it locally

The service worker needs HTTP or HTTPS. There are no packages to install.

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm run serve`.
4. Open `http://127.0.0.1:4173/`.

To use another port, run `node scripts/serve.mjs 4174`.

## Install on a Pixel 7

1. Deploy the folder contents to an HTTPS host such as GitHub Pages; see `DEPLOYMENT.md`.
2. Open the deployed address in Chrome on the Pixel 7.
3. Open Chrome's menu and choose **Install app** or **Add to Home screen**.
4. Launch the app once while online so the complete offline shell is cached.
5. Tap the pencil beside the profile cards to configure the names Nora and Reagan.

Gameplay requests landscape orientation. If orientation lock is unavailable, the game pauses and shows a rotate prompt instead of continuing behind an awkward portrait layout.

## Checks

- `npm test` runs the dependency-free rules, scoring, tournament, migration, storage, and achievement tests.
- `npm run check` validates the required project files, manifest, dashboard content, and service-worker cache inventory.
- `npm run icons` regenerates the original PNG icons using Node's built-in libraries.

See `TEST-REPORT.md` for completed automated/browser checks and `TEST-CHECKLIST.md` for the remaining physical-phone checks.

## Project map

```text
index.html                       Arcade screens, game setup, HUD, and dialogs
css/styles.css                   Responsive visual system and game presentation
js/app.js                        Shell, profiles, results, saves, and game wiring
js/core/bubble-rules.js          Pure scoring, timing, fairness, and medal rules
js/core/data.js                  Save schema v4 and achievement catalog
js/core/storage.js               Migration, local persistence, export/import
js/core/audio.js                 Procedural effects and music
js/core/game-host.js             Shared launch/pause/resume/exit lifecycle
js/games/bubble-blast-duo.js     Canvas renderer, multitouch, rounds, power-ups
service-worker.js                Versioned offline cache and update lifecycle
```

Future games should implement `launch(options)`, `pause(reason)`, `resume()`, and `exit()`, then register a factory with `GameHost`.
