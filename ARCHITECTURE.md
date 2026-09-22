# Architecture

The static single-page shell remains responsible for profiles, settings, navigation, persistence, achievements, and results. Bubble Blast Duo owns only its live match state and returns a serializable match summary.

## Boundaries

- **Shell:** `index.html`, `css/styles.css`, and `js/app.js`
- **Lifecycle host:** `js/core/game-host.js` creates one active game and forwards launch, pause, resume, and exit
- **Pure rules:** `js/core/bubble-rules.js` defines options, timers, scoring, multipliers, medals, lane isolation, and mirrored positions without browser state
- **Game engine:** `js/games/bubble-blast-duo.js` owns Canvas rendering, pointer IDs, spawn scheduling, countdowns, rounds, effects, and result construction
- **Persistence:** `js/core/data.js` defines schema v4 and migrations; `js/core/storage.js` is the only localStorage boundary
- **Achievements:** `js/core/achievements.js` evaluates completed-match facts after statistics are updated
- **Audio:** `js/core/audio.js` synthesizes all sound and music locally after an intentional player interaction
- **Offline/install:** `manifest.webmanifest` and `service-worker.js`

## Input isolation

Each `pointerdown` receives a stable pointer ID and is assigned to a lane from its initial X coordinate. The pointer ID stays registered until pointer up, cancel, or lost capture. Hit testing only considers bubbles with the same lane. Solo maps the whole field to lane zero. This supports two independent fingers without a touch on one side triggering the other side.

## Fair competitive spawning

Versus creates paired bubbles from one spawn record. Both receive the same type, radius, speed, color family, vertical position, and wobble phase. Horizontal positions and wobble direction are mirrored around the center divider. Player actions can naturally change later lane populations, but the incoming challenge sequence is equal.

## Performance

- One `requestAnimationFrame` loop with delta clamping after interruptions
- Canvas device-pixel-ratio capped at 2
- Cached static background and cached glossy bubble sprites
- Bounded bubble and particle counts
- No per-frame DOM writes; HUD callbacks update on score/second/state changes
- Reduced Motion lowers particles and removes background pulse/shake
- Difficulty escalation changes spawn intervals and speed without creating extra loops

## Save migration

Schema v4 adds Bubble Blast statistics and the music preference. Version 1–3 saves are normalized into the new shape and then written to `pixel-arcade-save-v4`. Names, avatars, general scores, unlocked achievements, and settings are preserved. Backups are normalized through the same migration path.
