import { BUBBLE_TYPES, DIFFICULTIES, accuracyBonus, comboMultiplier, laneForPoint, medalForScore, mirroredPair, normalizeGameOptions, remainingSeconds, scoreBubble } from '../core/bubble-rules.js';

const COLORS = [
  ['#d8ffff', '#35dce8', '#513be9'], ['#ffe0f0', '#ff4fa3', '#7831dc'],
  ['#f7ffc9', '#afea4f', '#12a99c'], ['#fff5bd', '#ff9e48', '#e83e74']
];
const TYPE_COLORS = { gold: ['#fffbd0','#ffd344','#ee6b28'], blast: ['#ffe4fa','#f655c0','#6b32e8'], boost: ['#d8ffff','#44f1d5','#3970ee'], freeze: ['#f3ffff','#82dfff','#516cf4'] };

export class BubbleBlastDuo {
  constructor({ canvas, audio, hapticsEnabled, reducedMotion, onScore, onTime, onPhase, onTeamTarget, onPower, onRound, onComplete, random = Math.random }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.audio = audio; this.hapticsEnabled = hapticsEnabled; this.reducedMotion = reducedMotion; this.random = random;
    this.onScore = onScore; this.onTime = onTime; this.onPhase = onPhase; this.onTeamTarget = onTeamTarget; this.onPower = onPower; this.onRound = onRound; this.onComplete = onComplete;
    this.onPointerDown = this.onPointerDown.bind(this); this.onPointerEnd = this.onPointerEnd.bind(this); this.resize = this.resize.bind(this); this.frame = this.frame.bind(this);
    this.resizeObserver = new ResizeObserver(this.resize); this.raf = 0; this.isRunning = false; this.paused = false; this.pointerLanes = new Map(); this.spriteCache = new Map();
  }

  launch(options = {}) {
    this.options = { ...normalizeGameOptions(options), soloPlayer: options.soloPlayer === 1 ? 1 : 0 };
    this.mode = this.options.mode; this.format = this.options.format; this.difficulty = this.options.difficulty; this.rules = DIFFICULTIES[this.difficulty];
    this.scores = [0, 0]; this.pops = [0, 0]; this.misses = [0, 0]; this.powerUps = [0, 0]; this.combos = [0, 0]; this.bestCombos = [0, 0]; this.lastPops = [0, 0]; this.boostUntil = [0, 0]; this.freezeUntil = [0, 0];
    this.roundWins = [0, 0]; this.roundResults = []; this.roundIndex = 0; this.teamPops = 0; this.teamTarget = this.rules.target; this.teamRewards = 0;
    this.bubbles = []; this.particles = []; this.floaters = []; this.spawnClock = 0; this.lastFrame = performance.now(); this.pausedAt = 0; this.isRunning = true; this.paused = false; this.bubbleId = 0; this.shakeUntil = 0;
    this.canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) this.canvas.addEventListener(event, this.onPointerEnd, { passive: false });
    this.resizeObserver.observe(this.canvas); this.resize(); this.resetRound(); this.startCountdown('GET READY'); this.emitScore(); this.emitTeamTarget(); this.audio.startMusic(); this.raf = requestAnimationFrame(this.frame);
  }

  resetRound() {
    this.roundBaseScores = [...this.scores]; this.roundPops = [0, 0]; this.roundMisses = [0, 0]; this.roundPowerUps = [0, 0]; this.combos = [0, 0]; this.lastPops = [0, 0]; this.boostUntil = [0, 0]; this.freezeUntil = [0, 0]; this.bubbles.length = 0; this.particles.length = 0; this.floaters.length = 0; this.spawnClock = 0; this.lastSecond = this.options.roundDuration;
  }

  startCountdown(kicker) {
    const now = performance.now(); this.phase = 'countdown'; this.phaseEndsAt = now + 3000; this.lastCountdown = 4;
    this.onPhase({ visible: true, kicker, value: '3', hint: this.mode === 'solo' ? 'The whole field is yours' : 'Pop bubbles on your side', round: this.roundIndex + 1, rounds: this.options.rounds });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect(); const oldWidth = this.width || rect.width; const oldHeight = this.height || rect.height; const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height); this.dpr = dpr; this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (oldWidth && oldHeight && this.bubbles) for (const bubble of this.bubbles) { bubble.x *= this.width / oldWidth; bubble.y *= this.height / oldHeight; }
    this.spriteCache.clear(); this.buildBackground();
  }

  buildBackground() {
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(this.width); canvas.height = Math.ceil(this.height); const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#07051d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const [x, color] of [[.18,'#087e8e55'],[.82,'#a0196950']]) { const glow = ctx.createRadialGradient(canvas.width * x, canvas.height * .52, 0, canvas.width * x, canvas.height * .52, Math.max(canvas.width, canvas.height) * .55); glow.addColorStop(0, color); glow.addColorStop(1, '#07051d00'); ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    const stars = Math.min(95, Math.floor(canvas.width * canvas.height / 5800)); for (let i = 0; i < stars; i++) { ctx.fillStyle = i % 5 ? '#ffffff55' : '#8dfbffaa'; ctx.beginPath(); ctx.arc((i * 83.7) % canvas.width, (i * 47.3) % canvas.height, .5 + (i % 3) * .35, 0, Math.PI * 2); ctx.fill(); }
    this.background = canvas;
  }

  laneBounds(lane) {
    const top = 68; const bottom = 66; if (this.mode === 'solo') return { x: 14, y: top, w: this.width - 28, h: this.height - top - bottom };
    return { x: lane * this.width / 2 + 8, y: top, w: this.width / 2 - 16, h: this.height - top - bottom };
  }

  chooseType(elapsed) {
    const value = this.random(); if (elapsed < 5) return value < .92 ? 'normal' : 'gold';
    if (value < .76) return 'normal'; if (value < .83) return 'gold'; if (value < .89) return 'blast'; if (value < .95) return 'boost'; return 'freeze';
  }

  makeBubble(lane, type, radius, speed, normalizedX) {
    const bounds = this.laneBounds(lane); const usable = Math.max(1, bounds.w - radius * 2); const x = bounds.x + radius + usable * normalizedX;
    return { id: ++this.bubbleId, lane, type, x, y: bounds.y + bounds.h - radius, r: radius, vy: -speed, colorIndex: Math.floor(this.random() * COLORS.length), wobble: this.random() * Math.PI * 2, wobbleDir: 1, age: 0 };
  }

  spawn(elapsed) {
    const progress = Math.min(1, elapsed / this.options.roundDuration); const escalation = 1 + progress * .42 + this.roundIndex * .13; const radius = this.rules.minRadius + this.random() * (this.rules.maxRadius - this.rules.minRadius); const speed = this.rules.speed * escalation * (.86 + this.random() * .28); const type = this.chooseType(elapsed); const normalizedX = .05 + this.random() * .9;
    if (this.mode === 'versus') {
      const left = this.laneBounds(0); const right = this.laneBounds(1); const [x0, x1] = mirroredPair(normalizedX, left, right, radius);
      const pairSeed = Math.floor(this.random() * COLORS.length); const a = this.makeBubble(0, type, radius, speed, normalizedX); const b = this.makeBubble(1, type, radius, speed, 1 - normalizedX); a.x = x0; b.x = x1; a.colorIndex = b.colorIndex = pairSeed; a.wobble = b.wobble;
      b.wobbleDir = -1; this.bubbles.push(a, b);
    } else if (this.mode === 'coop' && this.random() < .28) {
      this.bubbles.push(this.makeBubble(0, type, radius, speed, normalizedX), this.makeBubble(1, type, radius, speed, 1 - normalizedX));
    } else {
      const lane = this.mode === 'solo' ? 0 : (this.random() < .5 ? 0 : 1); this.bubbles.push(this.makeBubble(lane, type, radius, speed, normalizedX));
    }
  }

  onPointerDown(event) {
    if (!this.isRunning || this.paused || this.phase !== 'playing' || this.pointerLanes.has(event.pointerId)) return; event.preventDefault();
    const rect = this.canvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const lane = laneForPoint(x, this.width, this.mode); this.pointerLanes.set(event.pointerId, lane);
    try { this.canvas.setPointerCapture(event.pointerId); } catch (_) { /* Capture is best-effort on older mobile browsers. */ }
    this.hitTest(lane, x, y, performance.now());
  }

  onPointerEnd(event) { this.pointerLanes.delete(event.pointerId); try { if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId); } catch (_) { /* Pointer may already be released. */ } }

  hitTest(lane, x, y, now) {
    let hitIndex = -1; let closest = Infinity;
    for (let i = this.bubbles.length - 1; i >= 0; i--) { const bubble = this.bubbles[i]; if (bubble.lane !== lane) continue; const distance = (x - bubble.x) ** 2 + (y - bubble.y) ** 2; if (distance <= (bubble.r * 1.3) ** 2 && distance < closest) { hitIndex = i; closest = distance; } }
    if (hitIndex >= 0) this.popBubble(hitIndex, lane, now); else { this.misses[lane]++; this.roundMisses[lane]++; this.combos[lane] = 0; this.audio.miss(); this.floaters.push({ x, y, text: 'MISS', color: lane ? '#ff90c8' : '#8dfbff', age: 0 }); this.emitScore(); }
  }

  popBubble(index, lane, now, chain = false) {
    const bubble = this.bubbles[index]; if (!bubble) return; this.bubbles.splice(index, 1);
    if (!chain) { this.combos[lane]++; this.lastPops[lane] = now; this.bestCombos[lane] = Math.max(this.bestCombos[lane], this.combos[lane]); }
    const boosted = this.boostUntil[lane] > now; const points = scoreBubble({ type: bubble.type, combo: this.combos[lane] || 1, boosted, chain }); this.scores[lane] += points; this.pops[lane]++; this.roundPops[lane]++;
    this.burst(bubble, points, chain); this.audio.pop(this.combos[lane], bubble.type !== 'normal'); if (this.hapticsEnabled()) navigator.vibrate?.(bubble.type === 'blast' ? [12,18,14] : 9);
    if (bubble.type !== 'normal' && !chain) this.activatePower(bubble, lane, now);
    if (this.mode === 'coop') this.advanceTeamGoal(); this.emitScore();
  }

  activatePower(bubble, lane, now) {
    this.powerUps[lane]++; this.roundPowerUps[lane]++; this.audio.power(bubble.type);
    if (bubble.type === 'boost') { this.boostUntil[lane] = Math.max(this.boostUntil[lane], now) + 6000; this.onPower({ lane, label: '×2 BOOST', seconds: 6 }); }
    else if (bubble.type === 'freeze') { this.freezeUntil[lane] = Math.max(this.freezeUntil[lane], now) + 5000; this.onPower({ lane, label: '❄ SLOW TIME', seconds: 5 }); }
    else if (bubble.type === 'blast') {
      this.shakeUntil = this.reducedMotion() ? 0 : now + 240; const victims = this.bubbles.map((item, index) => ({ item, index, distance: Math.hypot(item.x - bubble.x, item.y - bubble.y) })).filter(entry => entry.item.lane === lane && entry.distance < 190).sort((a,b) => a.distance - b.distance).slice(0, 5).sort((a,b) => b.index - a.index);
      for (const victim of victims) this.popBubble(victim.index, lane, now, true); this.onPower({ lane, label: `✹ BLAST +${victims.length}`, seconds: 2 });
    } else if (bubble.type === 'gold') this.onPower({ lane, label: '★ BONUS', seconds: 2 });
  }

  advanceTeamGoal() {
    this.teamPops++;
    if (this.teamPops >= this.teamTarget) { const reward = 250 + this.teamRewards * 100; this.scores[0] += Math.ceil(reward / 2); this.scores[1] += Math.floor(reward / 2); this.teamRewards++; this.teamPops = 0; this.teamTarget = Math.ceil(this.teamTarget * 1.35); this.audio.round(); this.onPower({ lane: -1, label: `TEAM REWARD +${reward}`, seconds: 3 }); if (this.hapticsEnabled()) navigator.vibrate?.([15,35,15]); }
    this.emitTeamTarget();
  }

  emitScore() {
    const now = performance.now(); this.onScore({ scores: [...this.scores], multipliers: [comboMultiplier(this.combos[0]) * (this.boostUntil[0] > now ? 2 : 1), comboMultiplier(this.combos[1]) * (this.boostUntil[1] > now ? 2 : 1)], combos: [...this.combos] });
  }
  emitTeamTarget() { this.onTeamTarget({ visible: this.mode === 'coop', current: this.teamPops, target: this.teamTarget, rewards: this.teamRewards }); }

  burst(bubble, points, chain) {
    const amount = this.reducedMotion() ? 5 : (bubble.type === 'blast' ? 18 : 11); const color = (TYPE_COLORS[bubble.type] || COLORS[bubble.colorIndex])[1];
    for (let i = 0; i < amount && this.particles.length < 240; i++) { const angle = i / amount * Math.PI * 2; const force = 45 + this.random() * (bubble.type === 'blast' ? 150 : 85); this.particles.push({ x: bubble.x, y: bubble.y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force, age: 0, color, r: 2 + this.random() * 4 }); }
    this.floaters.push({ x: bubble.x, y: bubble.y, text: `${chain ? 'CHAIN ' : ''}+${points}`, color: '#fff', age: 0 });
  }

  updatePhase(now) {
    if (this.phase === 'countdown') {
      const value = Math.max(0, Math.ceil((this.phaseEndsAt - now) / 1000));
      if (value !== this.lastCountdown && value > 0) { this.lastCountdown = value; this.audio.countdown(value); this.onPhase({ visible: true, kicker: this.roundIndex ? `ROUND ${this.roundIndex + 1}` : 'GET READY', value: String(value), hint: this.mode === 'solo' ? 'The whole field is yours' : 'Pop bubbles on your side', round: this.roundIndex + 1, rounds: this.options.rounds }); }
      if (now >= this.phaseEndsAt) { this.phase = 'playing'; this.roundStartedAt = now; this.lastSecond = this.options.roundDuration; this.audio.countdown(0); this.onPhase({ visible: false, round: this.roundIndex + 1, rounds: this.options.rounds }); this.onTime(this.options.roundDuration); }
    } else if (this.phase === 'intermission' && now >= this.phaseEndsAt) { this.roundIndex++; this.resetRound(); this.startCountdown(`ROUND ${this.roundIndex + 1}`); }
  }

  update(dt, now) {
    if (this.phase !== 'playing') { this.updatePhase(now); return; }
    const elapsedMs = now - this.roundStartedAt; const elapsed = elapsedMs / 1000; const remaining = remainingSeconds(this.options.roundDuration, elapsedMs);
    if (remaining !== this.lastSecond) { this.lastSecond = remaining; this.onTime(remaining); this.updatePowerLabels(now); }
    if (elapsed >= this.options.roundDuration) { this.endRound(now); return; }
    for (let lane = 0; lane < 2; lane++) if (this.combos[lane] && now - this.lastPops[lane] > 2400) { this.combos[lane] = 0; this.emitScore(); }
    this.spawnClock += dt; const interval = this.rules.spawnInterval / (1 + Math.min(1, elapsed / this.options.roundDuration) * .38 + this.roundIndex * .1); const max = this.mode === 'versus' ? this.rules.maxBubbles * 2 : this.rules.maxBubbles;
    if (this.spawnClock >= interval && this.bubbles.length < max) { this.spawnClock = 0; this.spawn(elapsed); }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i]; bubble.age += dt; const slow = this.freezeUntil[bubble.lane] > now ? .53 : 1; bubble.y += bubble.vy * slow * dt; bubble.x += Math.sin(bubble.age * 2.2 + bubble.wobble) * 8 * dt * bubble.wobbleDir;
      const bounds = this.laneBounds(bubble.lane); if (bubble.y + bubble.r < bounds.y) { this.bubbles.splice(i, 1); if (this.combos[bubble.lane]) { this.combos[bubble.lane] = 0; this.emitScore(); } }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .955; p.vy = p.vy * .955 + 26 * dt; if (p.age > .7) this.particles.splice(i, 1); }
    for (let i = this.floaters.length - 1; i >= 0; i--) { this.floaters[i].age += dt; if (this.floaters[i].age > .72) this.floaters.splice(i, 1); }
  }

  updatePowerLabels(now) {
    for (let lane = 0; lane < 2; lane++) { const boost = Math.ceil((this.boostUntil[lane] - now) / 1000); const freeze = Math.ceil((this.freezeUntil[lane] - now) / 1000); if (boost > 0) this.onPower({ lane, label: '×2 BOOST', seconds: boost }); else if (freeze > 0) this.onPower({ lane, label: '❄ SLOW TIME', seconds: freeze }); else this.onPower({ lane, label: '', seconds: 0 }); }
  }

  endRound(now) {
    for (let lane = 0; lane < (this.mode === 'solo' ? 1 : 2); lane++) this.scores[lane] += accuracyBonus(this.roundPops[lane], this.roundPops[lane] + this.roundMisses[lane]);
    const roundScores = this.scores.map((score, lane) => score - this.roundBaseScores[lane]); let winner = -1;
    if (this.mode === 'versus' && roundScores[0] !== roundScores[1]) { winner = roundScores[0] > roundScores[1] ? 0 : 1; this.roundWins[winner]++; }
    const result = { number: this.roundIndex + 1, scores: roundScores, pops: [...this.roundPops], misses: [...this.roundMisses], winner }; this.roundResults.push(result); this.emitScore(); this.onRound(result);
    if (this.roundIndex + 1 < this.options.rounds) { this.phase = 'intermission'; this.phaseEndsAt = now + 2600; this.bubbles.length = 0; this.audio.round(); const message = winner < 0 ? (this.mode === 'coop' ? 'TEAM GOAL' : 'ROUND TIED') : `PLAYER ${winner + 1} LEADS`; this.onPhase({ visible: true, kicker: `ROUND ${this.roundIndex + 1} COMPLETE`, value: message, hint: `Next round in a moment`, round: this.roundIndex + 1, rounds: this.options.rounds }); }
    else this.finish();
  }

  finish() {
    if (!this.isRunning) return; this.isRunning = false; cancelAnimationFrame(this.raf); this.audio.stopMusic(); this.audio.finish();
    const totalPops = this.pops[0] + this.pops[1]; const totalAttempts = totalPops + this.misses[0] + this.misses[1]; const teamScore = this.scores[0] + this.scores[1]; let winnerLane = -1;
    if (this.mode === 'versus') { if (this.roundWins[0] !== this.roundWins[1]) winnerLane = this.roundWins[0] > this.roundWins[1] ? 0 : 1; else if (this.scores[0] !== this.scores[1]) winnerLane = this.scores[0] > this.scores[1] ? 0 : 1; }
    const medals = this.mode === 'coop' ? [medalForScore({ score: teamScore, mode: 'coop', format: this.format, difficulty: this.difficulty }), medalForScore({ score: teamScore, mode: 'coop', format: this.format, difficulty: this.difficulty })]
      : [medalForScore({ score: this.scores[0], mode: this.mode, format: this.format, difficulty: this.difficulty }), this.mode === 'solo' ? 'starter' : medalForScore({ score: this.scores[1], mode: this.mode, format: this.format, difficulty: this.difficulty })];
    const tournamentWon = this.format === 'tournament' && (this.mode === 'versus' ? winnerLane >= 0 : medals[0] !== 'starter');
    this.onComplete({ mode: this.mode, format: this.format, difficulty: this.difficulty, soloPlayer: this.options.soloPlayer, scores: [...this.scores], pops: [...this.pops], misses: [...this.misses], powerUps: [...this.powerUps], totalPops, totalAttempts, bestCombo: Math.max(...this.bestCombos), bestCombos: [...this.bestCombos], teamScore, teamRewards: this.teamRewards, roundWins: [...this.roundWins], roundResults: [...this.roundResults], roundsCompleted: this.roundResults.length, winnerLane, medals, tournamentWon });
  }

  getSprite(bubble) {
    const rounded = Math.round(bubble.r / 3) * 3; const key = `${bubble.type}-${bubble.colorIndex}-${rounded}`; if (this.spriteCache.has(key)) return this.spriteCache.get(key);
    const padding = 18; const size = (rounded + padding) * 2; const canvas = document.createElement('canvas'); canvas.width = size * this.dpr; canvas.height = size * this.dpr; const ctx = canvas.getContext('2d'); ctx.scale(this.dpr, this.dpr); const c = size / 2; const palette = TYPE_COLORS[bubble.type] || COLORS[bubble.colorIndex];
    const gradient = ctx.createRadialGradient(c - rounded * .35, c - rounded * .4, rounded * .04, c, c, rounded); gradient.addColorStop(0, palette[0]); gradient.addColorStop(.46, palette[1]); gradient.addColorStop(1, palette[2]);
    ctx.shadowBlur = bubble.type === 'normal' ? 13 : 22; ctx.shadowColor = palette[1]; ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(c, c, rounded, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffffbd'; ctx.lineWidth = bubble.type === 'normal' ? 1.5 : 3; if (bubble.type === 'boost') ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffffffc7'; ctx.beginPath(); ctx.ellipse(c - rounded * .3, c - rounded * .35, rounded * .2, rounded * .105, -.58, 0, Math.PI * 2); ctx.fill();
    if (bubble.type !== 'normal') { ctx.fillStyle = bubble.type === 'gold' ? '#5b2c18' : '#23133f'; ctx.font = `900 ${bubble.type === 'boost' ? rounded * .58 : rounded * .72}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(BUBBLE_TYPES[bubble.type].symbol, c, c + 2); }
    this.spriteCache.set(key, canvas); return canvas;
  }

  render(now) {
    const { ctx, width, height } = this; const shaking = now < this.shakeUntil; ctx.save(); if (shaking) ctx.translate((this.random() - .5) * 7, (this.random() - .5) * 5); ctx.drawImage(this.background, 0, 0, width, height);
    if (!this.reducedMotion()) { const pulse = .5 + Math.sin(now / 900) * .5; ctx.globalAlpha = .05 + pulse * .035; ctx.fillStyle = '#8b68ff'; ctx.beginPath(); ctx.arc(width * .5, height * .58, Math.min(width,height) * (.55 + pulse * .06), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    if (this.mode !== 'solo') { ctx.setLineDash([5,10]); ctx.strokeStyle = '#ffffff2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(width / 2, 64); ctx.lineTo(width / 2, height - 58); ctx.stroke(); ctx.setLineDash([]); }
    for (let lane = 0; lane < (this.mode === 'solo' ? 1 : 2); lane++) {
      if (this.boostUntil[lane] > now) { const bounds = this.laneBounds(lane); ctx.strokeStyle = lane ? '#ff75bd88' : '#62f7f088'; ctx.lineWidth = 3; ctx.strokeRect(bounds.x + 4, bounds.y + 3, bounds.w - 8, bounds.h - 6); }
      if (this.freezeUntil[lane] > now) { const bounds = this.laneBounds(lane); ctx.fillStyle = '#92e9ff0c'; ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h); }
    }
    for (const bubble of this.bubbles) { const sprite = this.getSprite(bubble); const size = (bubble.r + 18) * 2; ctx.drawImage(sprite, bubble.x - size / 2, bubble.y - size / 2, size, size); }
    for (const p of this.particles) { const alpha = Math.max(0, 1 - p.age / .7); ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * alpha + 1, 0, Math.PI * 2); ctx.fill(); }
    for (const floater of this.floaters) { const alpha = Math.max(0, 1 - floater.age / .72); ctx.globalAlpha = alpha; ctx.fillStyle = floater.color; ctx.font = `900 ${15 + alpha * 4}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(floater.text, floater.x, floater.y - 16 - floater.age * 30); }
    ctx.globalAlpha = 1; ctx.font = '900 10px sans-serif'; ctx.letterSpacing = '1px'; ctx.textAlign = 'center'; ctx.fillStyle = '#8dfbff77';
    if (this.mode === 'solo') ctx.fillText('YOUR PLAY FIELD', width / 2, height - 69); else { ctx.fillText('PLAYER 1 ZONE', width * .25, height - 69); ctx.fillStyle = '#ff8ac977'; ctx.fillText('PLAYER 2 ZONE', width * .75, height - 69); }
    ctx.restore();
  }

  frame(now) { if (!this.isRunning) return; const dt = Math.min(.05, (now - this.lastFrame) / 1000); this.lastFrame = now; if (!this.paused) this.update(dt, now); this.render(now); if (this.isRunning) this.raf = requestAnimationFrame(this.frame); }
  pause(reason = 'player') { if (!this.isRunning || this.paused) return; this.paused = true; this.pauseReason = reason; this.pausedAt = performance.now(); this.audio.stopMusic(); }
  resume() { if (!this.isRunning || !this.paused) return; const pausedFor = performance.now() - this.pausedAt; if (this.phase === 'playing') this.roundStartedAt += pausedFor; else this.phaseEndsAt += pausedFor; this.paused = false; this.pauseReason = ''; this.lastFrame = performance.now(); this.audio.startMusic(); }
  exit() {
    this.isRunning = false; cancelAnimationFrame(this.raf); this.audio.stopMusic(); this.pointerLanes.clear(); this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    for (const event of ['pointerup','pointercancel','lostpointercapture']) this.canvas.removeEventListener(event, this.onPointerEnd); this.resizeObserver.disconnect();
  }
}
