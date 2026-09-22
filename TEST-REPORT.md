# Test report — version 1.1.0

Date: September 22, 2026

## Automated results

- **14/14 Node tests passed:** formats and clocks, option validation, lane isolation, mirrored positions, combo/boost scoring, accuracy bonuses, medals, timer math, achievement inventory, default saves, validation, v1 migration, v3→v4 migration, backup round-trip, and achievement idempotency
- **JavaScript syntax:** checked for every `.js` and `.mjs` source file
- **Project integrity:** manifest, required files, featured/upcoming cards, and offline-cache inventory checked

## Browser integration results

Tested in the in-app Chromium browser at Pixel 7-class CSS viewports.

- Dashboard and match setup render without console errors or warnings
- Pixel 7 portrait dashboard and single-column player statistics have no horizontal overflow
- Co-op Classic starts with a 60-second timer and visible team goal
- Left and right lanes score independently; cross-lane hit testing did not occur
- Slow Time power-up activated, displayed a symbol/text status, and awarded points
- Pause held the timer constant; resume continued it
- Portrait rotation paused the match and showed the landscape prompt; returning to landscape resumed the timer
- Versus Tournament started at Round 1/3 on Turbo and restart reset the round, timer, and both scores
- A full three-round Tournament advanced through all rounds, reached Round 3/3, produced a tie result, and rendered all three round recaps
- Live Versus bubbles rendered as mirrored pairs
- Solo Classic used the selected active player, hid the second-player HUD, and started on Chill difficulty
- Classic completion produced scores, accuracy, medal state, achievements, and working Play Again/Change Mode/Arcade controls
- Completed-match counts appeared in both players' Bubble Blast statistics on the dashboard
- The version 1.1.0 shell reloaded successfully after its local web server was stopped

## Performance statement

The implementation targets 60 FPS using one animation loop, cached sprites/backgrounds, a DPR cap, and bounded effects. Actual 60 FPS performance on the physical Pixel 7 has **not** been measured and is not claimed.

## Physical-device work remaining

Hardware multitouch concurrency, Android gesture edges, haptics, audio routing, PWA installation UI, battery/thermal behavior, and measured frame pacing require the real Pixel 7. See `TEST-CHECKLIST.md`.
