export class GameHost {
  constructor() { this.factories = new Map(); this.active = null; this.activeId = null; }
  register(id, factory) {
    if (typeof factory !== 'function') throw new TypeError('A game factory is required.');
    this.factories.set(id, factory);
  }
  launch(id, options) {
    this.exit();
    const factory = this.factories.get(id);
    if (!factory) throw new Error(`Game not registered: ${id}`);
    this.activeId = id; this.active = factory(); this.active.launch(options);
    return this.active;
  }
  pause(reason = 'player') { this.active?.pause(reason); }
  resume() { this.active?.resume(); }
  exit() { if (this.active) this.active.exit(); this.active = null; this.activeId = null; }
  get isPlaying() { return Boolean(this.active?.isRunning); }
}
