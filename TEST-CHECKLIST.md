# Physical Pixel 7 test checklist

Desktop automation cannot prove Android hardware behavior or actual device frame rate. Complete these on the intended Pixel 7 before treating the release as device-certified.

## Installation and offline

- [ ] Install from Chrome and confirm the standard icon, maskable icon crop, splash background, and standalone launch
- [ ] Turn on airplane mode, fully close the app, relaunch, and complete Classic and Tournament matches offline
- [ ] Publish a changed service-worker cache name during a match and confirm the update prompt waits until the match ends or exits
- [ ] Confirm no camera, microphone, location, contacts, notification, or account permission is requested

## Touch and system behavior

- [ ] Place one finger in each play zone and pop two bubbles at exactly the same time
- [ ] Hold one finger down while the other player rapidly taps; confirm neither lane steals touches
- [ ] Swipe near both gesture-navigation edges and confirm Exit/Pause remain usable without accidental activation
- [ ] Press Android Home during countdown, play, and a power-up; reopen and confirm the game is paused with state intact
- [ ] Press Android Back from gameplay and confirm it returns safely to the arcade
- [ ] Rotate landscape → portrait → landscape during play and while manually paused

## Audio, display, and performance

- [ ] Confirm game music starts only after an intentional tap on **Start match**
- [ ] Test effects-only, music-only, and fully muted settings
- [ ] Confirm gentle vibration works and the Haptics setting disables it
- [ ] Test Reduced Motion, High Contrast, and Extra-large Controls
- [ ] Play at least three Turbo tournaments while Battery Saver is on; watch for missed touches, heat, or sustained frame drops
- [ ] Measure frame pacing with Android/Chrome performance tooling before making any device-level 60 FPS claim

## Saves and progression

- [ ] Finish Solo, Co-op, Versus, and a Tournament; verify the corresponding statistics and medals
- [ ] Unlock a power-up, accuracy, combo, and tournament achievement
- [ ] Export a backup, play another match, import the backup, and confirm the earlier progress returns
- [ ] Update from v1.0.0 without clearing site data and confirm names, scores, settings, and trophies remain
