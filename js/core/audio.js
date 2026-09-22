export class ArcadeAudio {
  constructor(isEnabled = () => true, isMusicEnabled = () => false) { this.isEnabled = isEnabled; this.isMusicEnabled = isMusicEnabled; this.context = null; this.musicTimer = 0; this.musicStep = 0; }
  ensure(force = false) {
    if (!force && !this.isEnabled() && !this.isMusicEnabled()) return null;
    const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return null;
    this.context ||= new Context(); if (this.context.state === 'suspended') this.context.resume(); return this.context;
  }
  tone(frequency, duration = .08, type = 'sine', volume = .055, delay = 0, music = false) {
    if (music ? !this.isMusicEnabled() : !this.isEnabled()) return;
    const context = this.ensure(); if (!context) return; const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, context.currentTime + delay); gain.gain.setValueAtTime(volume, context.currentTime + delay); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + delay + duration);
    oscillator.connect(gain).connect(context.destination); oscillator.start(context.currentTime + delay); oscillator.stop(context.currentTime + delay + duration);
  }
  click() { this.tone(310, .055, 'triangle', .035); }
  pop(combo = 0, special = false) { this.tone((special ? 680 : 430) + Math.min(combo, 15) * 22, .09, 'sine', .05); if (combo && combo % 5 === 0) this.combo(combo); }
  miss() { this.tone(150, .06, 'square', .018); }
  combo(combo) { const root = 520 + Math.min(combo, 25) * 8; this.tone(root, .12, 'triangle', .035); this.tone(root * 1.5, .15, 'sine', .025, .045); }
  power(type) {
    const notes = type === 'blast' ? [160, 110] : type === 'boost' ? [440, 660, 880] : type === 'freeze' ? [780, 620, 480] : [740, 990];
    notes.forEach((note, index) => this.tone(note, .18, type === 'blast' ? 'sawtooth' : 'sine', .035, index * .04));
  }
  countdown(value) { this.tone(value ? 330 + (3 - value) * 80 : 720, value ? .12 : .28, 'triangle', .045); }
  round() { [330, 440, 554].forEach((note, i) => this.tone(note, .24, 'triangle', .035, i * .06)); }
  finish() { [392, 523, 659, 784].forEach((note, i) => this.tone(note, .28, 'triangle', .045, i * .075)); }
  unlock() { [740, 980, 1240].forEach((note, i) => this.tone(note, .22, 'sine', .035, i * .07)); }
  startMusic() {
    this.stopMusic(); if (!this.isMusicEnabled()) return; this.ensure(true); const notes = [196, 247, 294, 330, 294, 247, 220, 247];
    const play = () => { if (!this.isMusicEnabled()) { this.stopMusic(); return; } const note = notes[this.musicStep++ % notes.length]; this.tone(note, .5, 'sine', .012, 0, true); this.tone(note * 2, .18, 'triangle', .006, .08, true); };
    play(); this.musicTimer = window.setInterval(play, 560);
  }
  stopMusic() { if (this.musicTimer) window.clearInterval(this.musicTimer); this.musicTimer = 0; }
  syncMusic(playing) { if (playing && this.isMusicEnabled()) { if (!this.musicTimer) this.startMusic(); } else this.stopMusic(); }
}

export function haptic(enabled, pattern = 12) { if (enabled && navigator.vibrate) navigator.vibrate(pattern); }
