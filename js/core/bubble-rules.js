export const DIFFICULTIES = Object.freeze({
  chill: { label: 'Chill', spawnInterval: .78, speed: 42, minRadius: 32, maxRadius: 45, maxBubbles: 18, target: 20, medalScale: .82 },
  classic: { label: 'Classic', spawnInterval: .6, speed: 54, minRadius: 28, maxRadius: 41, maxBubbles: 24, target: 28, medalScale: 1 },
  turbo: { label: 'Turbo', spawnInterval: .44, speed: 68, minRadius: 25, maxRadius: 37, maxBubbles: 30, target: 34, medalScale: 1.18 }
});

export const BUBBLE_TYPES = Object.freeze({
  normal: { base: 10, symbol: '', label: 'Bubble' },
  gold: { base: 60, symbol: '★', label: 'Bonus bubble' },
  blast: { base: 25, symbol: '✹', label: 'Blast bubble' },
  boost: { base: 20, symbol: '×2', label: 'Score boost bubble' },
  freeze: { base: 20, symbol: '❄', label: 'Slow-time bubble' }
});

export function normalizeGameOptions(input = {}) {
  const mode = ['solo', 'coop', 'versus'].includes(input.mode) ? input.mode : 'coop';
  const format = input.format === 'tournament' ? 'tournament' : 'classic';
  const difficulty = DIFFICULTIES[input.difficulty] ? input.difficulty : 'classic';
  return { mode, format, difficulty, rounds: format === 'tournament' ? 3 : 1, roundDuration: format === 'tournament' ? 30 : 60 };
}

export function comboMultiplier(combo) { return Math.min(5, 1 + Math.floor(Math.max(0, combo) / 5)); }
export function scoreBubble({ type = 'normal', combo = 1, boosted = false, chain = false } = {}) {
  const bubble = BUBBLE_TYPES[type] || BUBBLE_TYPES.normal; const multiplier = comboMultiplier(combo) * (boosted ? 2 : 1);
  return Math.round(bubble.base * multiplier * (chain ? .6 : 1));
}
export function accuracyBonus(pops, attempts) {
  if (!attempts || !pops) return 0; const accuracy = Math.min(1, pops / attempts);
  return Math.round(accuracy * 150) + (accuracy === 1 && pops >= 15 ? 100 : 0);
}
export function medalForScore({ score = 0, mode = 'solo', format = 'classic', difficulty = 'classic' } = {}) {
  const modeScale = mode === 'coop' ? 1.8 : 1; const timeScale = format === 'tournament' ? 1.65 : 1; const base = 650 * modeScale * timeScale * DIFFICULTIES[difficulty].medalScale;
  if (score >= base * 1.65) return 'gold'; if (score >= base * 1.15) return 'silver'; if (score >= base * .72) return 'bronze'; return 'starter';
}
export function laneForPoint(x, width, mode = 'coop') { return mode === 'solo' ? 0 : (x < width / 2 ? 0 : 1); }
export function mirroredPair(normalizedX, leftBounds, rightBounds, radius) {
  const usableLeft = Math.max(0, leftBounds.w - radius * 2); const usableRight = Math.max(0, rightBounds.w - radius * 2); const n = Math.min(1, Math.max(0, normalizedX));
  return [leftBounds.x + radius + usableLeft * n, rightBounds.x + radius + usableRight * (1 - n)];
}
export function remainingSeconds(duration, elapsedMs) { return Math.max(0, Math.ceil(duration - Math.max(0, elapsedMs) / 1000)); }
