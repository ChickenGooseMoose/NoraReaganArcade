import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS } from '../js/core/data.js';
import { accuracyBonus, comboMultiplier, laneForPoint, medalForScore, mirroredPair, normalizeGameOptions, remainingSeconds, scoreBubble } from '../js/core/bubble-rules.js';

test('classic and tournament formats use the intended clocks', () => {
  assert.deepEqual(normalizeGameOptions({ mode: 'solo', format: 'classic', difficulty: 'chill' }), { mode: 'solo', format: 'classic', difficulty: 'chill', rounds: 1, roundDuration: 60 });
  assert.deepEqual(normalizeGameOptions({ mode: 'versus', format: 'tournament', difficulty: 'turbo' }), { mode: 'versus', format: 'tournament', difficulty: 'turbo', rounds: 3, roundDuration: 30 });
});

test('invalid game options fall back safely', () => {
  assert.deepEqual(normalizeGameOptions({ mode: 'bad', format: 'bad', difficulty: 'impossible' }), { mode: 'coop', format: 'classic', difficulty: 'classic', rounds: 1, roundDuration: 60 });
});

test('lane selection isolates touches and solo owns the full field', () => {
  assert.equal(laneForPoint(99, 400, 'versus'), 0); assert.equal(laneForPoint(301, 400, 'versus'), 1); assert.equal(laneForPoint(399, 400, 'solo'), 0);
});

test('competitive pair positions are mathematically mirrored', () => {
  const left = { x: 8, w: 184 }; const right = { x: 208, w: 184 }; const [x0, x1] = mirroredPair(.25, left, right, 20);
  assert.equal(x0 - left.x - 20, (right.x + right.w - 20) - x1); assert.ok(x0 < 100); assert.ok(x1 > 300);
});

test('combo and boost scoring escalate predictably', () => {
  assert.equal(comboMultiplier(0), 1); assert.equal(comboMultiplier(5), 2); assert.equal(comboMultiplier(99), 5);
  assert.equal(scoreBubble({ type: 'normal', combo: 1 }), 10); assert.equal(scoreBubble({ type: 'normal', combo: 5, boosted: true }), 40); assert.equal(scoreBubble({ type: 'gold', combo: 10 }), 180);
});

test('accuracy bonuses reward precision and perfect play', () => {
  assert.equal(accuracyBonus(0, 0), 0); assert.equal(accuracyBonus(10, 20), 75); assert.equal(accuracyBonus(15, 15), 250);
});

test('medals and timers honor difficulty and elapsed time', () => {
  assert.equal(medalForScore({ score: 200, mode: 'solo', format: 'classic', difficulty: 'classic' }), 'starter'); assert.equal(medalForScore({ score: 1200, mode: 'solo', format: 'classic', difficulty: 'classic' }), 'gold');
  assert.equal(remainingSeconds(60, 0), 60); assert.equal(remainingSeconds(60, 1001), 59); assert.equal(remainingSeconds(60, 61000), 0);
});

test('Bubble Blast ships with at least ten meaningful achievements', () => {
  assert.ok(ACHIEVEMENTS.length >= 10); assert.ok(ACHIEVEMENTS.some(item => item.id === 'power-player')); assert.ok(ACHIEVEMENTS.some(item => item.id === 'tournament-champ'));
});
