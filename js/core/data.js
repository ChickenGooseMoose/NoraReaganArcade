export const STORAGE_VERSION = 4;
export const APP_VERSION = '1.1.0';

export const AVATARS = [
  { id: 'nova', label: 'Nova', className: 'avatar-0' }, { id: 'orbit', label: 'Orbit', className: 'avatar-1' },
  { id: 'sunbeam', label: 'Sunbeam', className: 'avatar-2' }, { id: 'sprout', label: 'Sprout', className: 'avatar-3' }
];

export const ACHIEVEMENTS = [
  { id: 'first-pop', icon: '✦', title: 'First Spark', text: 'Pop your very first bubble.' },
  { id: 'dynamic-duo', icon: '∞', title: 'Dynamic Duo', text: 'Finish a co-op match together.' },
  { id: 'combo-ten', icon: '⚡', title: 'Combo Comet', text: 'Reach a 10-pop combo.' },
  { id: 'combo-twentyfive', icon: '25', title: 'Unstoppable', text: 'Reach a 25-pop combo.' },
  { id: 'friendly-rivals', icon: '★', title: 'Friendly Rivals', text: 'Finish a versus match.' },
  { id: 'century', icon: '100', title: 'Pop Century', text: 'Pop 100 bubbles as a team.' },
  { id: 'score-five', icon: '↑', title: 'Sky High', text: 'Score 500 points in one match.' },
  { id: 'score-thousand', icon: '1K', title: 'Into Orbit', text: 'Score 1,000 points in one match.' },
  { id: 'three-rounds', icon: '3', title: 'Arcade Regulars', text: 'Complete three rounds.' },
  { id: 'sharp-shooters', icon: '◎', title: 'Sharp Shooters', text: 'Finish above 90% accuracy with 10+ pops.' },
  { id: 'perfect-popper', icon: '◇', title: 'Perfect Popper', text: 'Finish with 100% accuracy and 15+ pops.' },
  { id: 'power-player', icon: '✹', title: 'Power Player', text: 'Activate 20 power-ups.' },
  { id: 'team-target', icon: '♥', title: 'Goal Getters', text: 'Earn a shared team reward.' },
  { id: 'tournament-champ', icon: '♛', title: 'Cup Champions', text: 'Win a three-round tournament.' },
  { id: 'gold-rush', icon: '●', title: 'Gold Rush', text: 'Earn a gold medal.' },
  { id: 'turbo-finish', icon: '»', title: 'Turbo Charged', text: 'Complete a match on Turbo difficulty.' }
];

export const createBubbleStats = () => ({
  games: 0, classicGames: 0, tournaments: 0, tournamentWins: 0, soloGames: 0, coopGames: 0, versusGames: 0,
  powerUps: 0, teamRewards: 0, perfectGames: 0, totalScore: 0, bestAccuracy: 0,
  medals: { bronze: 0, silver: 0, gold: 0 }, highScores: { solo: 0, coop: 0, versus: 0 }
});
const emptyStats = () => ({ rounds: 0, pops: 0, misses: 0, highScore: 0, wins: 0, bestCombo: 0, bubbleBlast: createBubbleStats() });
const emptySharedBubbleStats = () => ({ teamBest: 0, teamRewards: 0, powerUps: 0, medals: { bronze: 0, silver: 0, gold: 0 } });

export function createDefaultData() {
  return { version: STORAGE_VERSION,
    profiles: [{ id: 'player-1', name: 'Player 1', avatar: 'nova', stats: emptyStats() }, { id: 'player-2', name: 'Player 2', avatar: 'orbit', stats: emptyStats() }],
    activeProfile: 0, shared: { totalRounds: 0, totalPops: 0, achievements: {}, bubbleBlast: emptySharedBubbleStats() },
    settings: { sound: true, music: true, haptics: true, reducedMotion: false, highContrast: false, largeControls: false },
    meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } };
}

function safeNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : fallback; }
function normalizeMedals(input = {}) { return { bronze: safeNumber(input.bronze), silver: safeNumber(input.silver), gold: safeNumber(input.gold) }; }
function normalizeBubbleStats(input = {}) {
  const base = createBubbleStats();
  for (const key of ['games','classicGames','tournaments','tournamentWins','soloGames','coopGames','versusGames','powerUps','teamRewards','perfectGames','totalScore','bestAccuracy']) base[key] = safeNumber(input[key]);
  base.medals = normalizeMedals(input.medals); base.highScores = { solo: safeNumber(input.highScores?.solo), coop: safeNumber(input.highScores?.coop), versus: safeNumber(input.highScores?.versus) }; return base;
}

export function normalizeData(input) {
  const base = createDefaultData(); if (!input || typeof input !== 'object') return base; const profiles = Array.isArray(input.profiles) ? input.profiles.slice(0, 2) : [];
  base.profiles = base.profiles.map((fallback, index) => {
    const profile = profiles[index] && typeof profiles[index] === 'object' ? profiles[index] : {}; const stats = profile.stats && typeof profile.stats === 'object' ? profile.stats : {}; const cleanName = typeof profile.name === 'string' ? profile.name.trim().slice(0, 18) : '';
    return { id: fallback.id, name: cleanName || fallback.name, avatar: AVATARS.some(item => item.id === profile.avatar) ? profile.avatar : fallback.avatar,
      stats: { rounds: safeNumber(stats.rounds), pops: safeNumber(stats.pops), misses: safeNumber(stats.misses), highScore: safeNumber(stats.highScore), wins: safeNumber(stats.wins), bestCombo: safeNumber(stats.bestCombo), bubbleBlast: normalizeBubbleStats(stats.bubbleBlast) } };
  });
  base.activeProfile = input.activeProfile === 1 ? 1 : 0; const shared = input.shared && typeof input.shared === 'object' ? input.shared : {}; const achievements = shared.achievements && typeof shared.achievements === 'object' ? shared.achievements : {}; const game = shared.bubbleBlast || {};
  base.shared = { totalRounds: safeNumber(shared.totalRounds), totalPops: safeNumber(shared.totalPops), achievements: Object.fromEntries(ACHIEVEMENTS.filter(a => achievements[a.id]).map(a => [a.id, String(achievements[a.id])])), bubbleBlast: { teamBest: safeNumber(game.teamBest), teamRewards: safeNumber(game.teamRewards), powerUps: safeNumber(game.powerUps), medals: normalizeMedals(game.medals) } };
  const settings = input.settings && typeof input.settings === 'object' ? input.settings : {}; for (const key of Object.keys(base.settings)) if (typeof settings[key] === 'boolean') base.settings[key] = settings[key];
  base.meta.createdAt = typeof input.meta?.createdAt === 'string' ? input.meta.createdAt : base.meta.createdAt; base.meta.updatedAt = new Date().toISOString(); return base;
}

export function migrateData(input) {
  if (!input || typeof input !== 'object') return createDefaultData(); const version = Number(input.version || 1); const draft = structuredClone(input);
  if (version < 2) { draft.shared = draft.shared || { totalRounds: 0, totalPops: 0, achievements: {} }; draft.settings = { ...createDefaultData().settings, ...(draft.settings || {}) }; }
  if (version < 3) { draft.profiles = (draft.profiles || []).map((profile, index) => ({ id: `player-${index + 1}`, avatar: index ? 'orbit' : 'nova', ...profile })); draft.meta = draft.meta || {}; }
  if (version < 4) { draft.settings = { ...draft.settings, music: true }; draft.shared = { ...draft.shared, bubbleBlast: draft.shared?.bubbleBlast || emptySharedBubbleStats() }; draft.profiles = (draft.profiles || []).map(profile => ({ ...profile, stats: { ...profile.stats, bubbleBlast: profile.stats?.bubbleBlast || createBubbleStats() } })); }
  draft.version = STORAGE_VERSION; return normalizeData(draft);
}
