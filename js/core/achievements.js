import { ACHIEVEMENTS } from './data.js';

export function evaluateAchievements(data, result) {
  const unlocked = []; const attempts = result.totalAttempts || 0; const accuracy = attempts ? result.totalPops / attempts : 0; const maxScore = Math.max(0, ...(result.scores || [0]));
  const checks = {
    'first-pop': data.shared.totalPops >= 1, 'dynamic-duo': result.mode === 'coop', 'combo-ten': result.bestCombo >= 10, 'combo-twentyfive': result.bestCombo >= 25,
    'friendly-rivals': result.mode === 'versus', century: data.shared.totalPops >= 100, 'score-five': maxScore >= 500 || result.teamScore >= 500,
    'score-thousand': maxScore >= 1000 || result.teamScore >= 1000, 'three-rounds': (result.roundsCompleted || 1) >= 3 || data.shared.totalRounds >= 3,
    'sharp-shooters': result.totalPops >= 10 && accuracy >= .9, 'perfect-popper': result.totalPops >= 15 && accuracy === 1,
    'power-player': (data.shared.bubbleBlast?.powerUps || 0) >= 20, 'team-target': (result.teamRewards || 0) >= 1,
    'tournament-champ': result.format === 'tournament' && result.tournamentWon, 'gold-rush': result.medals?.includes('gold'), 'turbo-finish': result.difficulty === 'turbo'
  };
  for (const achievement of ACHIEVEMENTS) if (checks[achievement.id] && !data.shared.achievements[achievement.id]) { data.shared.achievements[achievement.id] = new Date().toISOString(); unlocked.push(achievement); }
  return unlocked;
}
