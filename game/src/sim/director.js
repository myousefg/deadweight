// The wave director: turns a wave's budget (see data/waves.js) into a timed schedule of spawns,
// feeds them into the sea as the wave plays, and reports how much of the wave is left.

import { W, H } from '../core/config.js';
import { ENEMY_COST } from '../enemies/index.js';
import { WAVE_RULES, waveDef } from '../data/waves.js';

/** A spawn point just outside the screen, far from the boat. */
export function edgePosition(rng, boat) {
  let best = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const side = rng.int(0, 3);
    const margin = 46;
    let x;
    let y;
    if (side === 0) { x = rng.range(0, W); y = -margin; }
    else if (side === 1) { x = W + margin; y = rng.range(0, H); }
    else if (side === 2) { x = rng.range(0, W); y = H + margin; }
    else { x = -margin; y = rng.range(0, H); }
    const gap = Math.hypot(x - boat.x, y - boat.y);
    if (!best || gap > best.gap) best = { x, y, gap };
    if (gap > 380) break;
  }
  return best;
}

export class WaveDirector {
  constructor(world) {
    this.world = world;
    this.wave = 0;
    this.clock = 0;
    this.schedule = [];
    this.total = 0;
  }

  begin(wave) {
    const { rng, stormy } = this.world;
    const def = waveDef(wave);
    this.wave = wave;
    this.clock = 0;
    this.schedule = [];
    this.total = 0;
    if (def.boss) {
      this.schedule.push({ time: 0.2, type: def.boss, count: 1, boss: true });
      this.total = 1;
      return;
    }

    const newest = def.types[def.types.length - 1];
    let remaining = Math.round(def.budget * (stormy ? WAVE_RULES.stormBudget : 1));
    const events = [];
    while (remaining > 0) {
      const options = def.types.filter((type) => ENEMY_COST[type].cost <= remaining);
      if (options.length === 0) break;
      const entries = options.map((type) => ({
        value: type,
        weight: WAVE_RULES.weights[type] * (type === newest && wave > 1 ? 1.8 : 1),
      }));
      const type = rng.weighted(entries);
      events.push({ type, count: ENEMY_COST[type].pack });
      remaining -= ENEMY_COST[type].cost;
    }
    events.forEach((event, index) => {
      const fraction = events.length > 1 ? index / (events.length - 1) : 0;
      event.time = 0.4 + Math.pow(fraction, 0.9) * def.span * 0.9 + rng.range(0, 1.4);
    });
    events.sort((a, b) => a.time - b.time);
    this.schedule = events;
    this.total = events.reduce((sum, event) => sum + event.count, 0);
  }

  update(dt) {
    const { world } = this;
    this.clock += dt;
    const alive = world.enemies.length;
    // Never leave the player waiting on an empty sea: pull the next spawn forward.
    if (alive === 0 && this.schedule.length > 0 && this.schedule[0].time - this.clock > 1.2) {
      this.clock = this.schedule[0].time - 1.2;
    }
    while (this.schedule.length > 0 && this.schedule[0].time <= this.clock) {
      const event = this.schedule[0];
      if (!event.boss && world.enemies.length + event.count > WAVE_RULES.aliveCap) break;
      this.schedule.shift();
      this.spawn(event);
    }
  }

  spawn(event) {
    const { world } = this;
    if (event.boss) {
      world.spawnEnemy(event.type, W / 2, -180);
      return;
    }
    const origin = edgePosition(world.rng, world.boat);
    for (let i = 0; i < event.count; i += 1) {
      const jitter = event.count > 1 ? 46 : 0;
      world.spawnEnemy(
        event.type,
        origin.x + world.rng.range(-jitter, jitter),
        origin.y + world.rng.range(-jitter, jitter),
      );
    }
  }

  /** True once nothing is left to spawn and nothing is left alive. */
  get cleared() {
    return this.schedule.length === 0 && this.world.enemies.length === 0;
  }

  /** How many creatures (alive or still to come) this wave has left, and how many it began with. */
  progress() {
    const waiting = this.schedule.reduce((sum, event) => sum + event.count, 0);
    return { left: waiting + this.world.enemies.length, total: Math.max(1, this.total) };
  }
}
