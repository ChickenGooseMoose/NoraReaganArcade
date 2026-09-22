# Release notes

## Version 1.1.0 — Bubble Blast Duo

Bubble Blast Duo is now the arcade's first fully developed game.

### Added

- 60-second Classic matches
- Three-round, 30-seconds-per-round Tournament matches
- Solo, cooperative, and competitive modes
- Chill, Classic, and Turbo difficulty
- Five-level combo multipliers and end-of-round accuracy bonuses
- Four symbol-marked special bubbles: Bonus, Blast, ×2 Boost, and Slow Time
- Cooperative team goals with escalating targets and score rewards
- Fair mirrored Versus spawn scheduling
- Bronze, silver, and gold medals
- Sixteen shared achievements, including power-up, perfect-accuracy, gold-medal, Turbo, and tournament goals
- Bubble Blast-specific games, modes, power-ups, medals, accuracy, score, and cup-win statistics
- Procedural countdown, combo, power-up, and celebration audio plus optional music
- Landscape rotation guard, match retry, tournament round recap, and active multipliers

### Improved

- Canvas performance through cached backgrounds and bubble sprites
- Pointer-ID tracking and lane isolation for simultaneous multitouch
- Safe-area spacing around gesture-navigation edges
- Reduced Motion behavior for particles, shake, and background animation
- Competitive fairness: matching type, size, speed, color family, height, and mirrored motion

### Data and updates

- Save schema upgraded from v3 to v4 with automatic migration
- Existing profiles, scores, settings, achievements, and backups remain compatible
- Offline cache upgraded to `pixel-arcade-v1.1.0` and includes the new rules module
