import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultData, migrateData, normalizeData, STORAGE_VERSION } from '../js/core/data.js';
import { ArcadeStorage, STORAGE_KEY } from '../js/core/storage.js';
import { evaluateAchievements } from '../js/core/achievements.js';

class MemoryStore {
  constructor() { this.items = new Map(); }
  getItem(key) { return this.items.get(key) ?? null; }
  setItem(key, value) { this.items.set(key, String(value)); }
}

test('default save contains two placeholder profiles', () => {
  const data = createDefaultData(); assert.equal(data.version, STORAGE_VERSION); assert.deepEqual(data.profiles.map(p => p.name), ['Player 1', 'Player 2']);
});

test('normalization limits names and rejects invalid values', () => {
  const data = normalizeData({ profiles: [{ name: 'A very long player name that is trimmed', avatar: 'bad', stats: { pops: -9 } }] });
  assert.equal(data.profiles[0].name.length, 18); assert.equal(data.profiles[0].avatar, 'nova'); assert.equal(data.profiles[0].stats.pops, 0); assert.equal(data.profiles[1].name, 'Player 2');
});

test('version one data migrates without losing scores', () => {
  const old = { version: 1, profiles: [{ name: 'Nora', stats: { highScore: 42 } }, { name: 'Reagan', stats: { highScore: 51 } }] };
  const data = migrateData(old); assert.equal(data.version, STORAGE_VERSION); assert.equal(data.profiles[0].stats.highScore, 42); assert.equal(data.profiles[1].name, 'Reagan');
});

test('version three data gains Bubble Blast stats and music without losing profiles', () => {
  const old = { version: 3, profiles: [{ name: 'Nora', stats: { pops: 12 } }, { name: 'Reagan', stats: { wins: 2 } }], shared: { totalRounds: 4, totalPops: 12, achievements: {} }, settings: { sound: false } };
  const data = migrateData(old); assert.equal(data.version, STORAGE_VERSION); assert.equal(data.profiles[0].stats.pops, 12); assert.equal(data.profiles[1].stats.bubbleBlast.games, 0); assert.equal(data.settings.music, true); assert.equal(data.shared.bubbleBlast.teamBest, 0);
});

test('storage round-trips and imports wrapped backups', () => {
  const memory = new MemoryStore(); const storage = new ArcadeStorage(memory); storage.load(); storage.data.profiles[0].name = 'Nora'; storage.save();
  const copy = new ArcadeStorage(memory); assert.equal(copy.load().profiles[0].name, 'Nora'); assert.ok(memory.getItem(STORAGE_KEY));
  const imported = copy.importText(JSON.stringify({ data: { profiles: [{ name: 'A' }, { name: 'B' }] } })); assert.deepEqual(imported.profiles.map(p => p.name), ['A', 'B']);
});

test('achievements unlock once and preserve dates', () => {
  const data = createDefaultData(); data.shared.totalRounds = 3; data.shared.totalPops = 120; data.shared.bubbleBlast.powerUps = 20;
  const round = { mode: 'coop', format: 'tournament', difficulty: 'turbo', scores: [1100, 100], teamScore: 1200, totalPops: 20, totalAttempts: 20, bestCombo: 25, roundsCompleted: 3, teamRewards: 1, tournamentWon: true, medals: ['gold', 'gold'] };
  const first = evaluateAchievements(data, round); const second = evaluateAchievements(data, round);
  assert.ok(first.length >= 12); assert.equal(second.length, 0); assert.ok(data.shared.achievements['dynamic-duo']); assert.ok(data.shared.achievements['tournament-champ']);
});
