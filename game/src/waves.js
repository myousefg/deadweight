// The wave table and the director that turns a wave's budget into a schedule of spawns.
// Each wave introduces a creature, then mixes it into everything seen so far.

import { W, H } from './config.js';
import { ENEMY_COST } from './enemies/index.js';

export const FINAL_WAVE = 9;
const ALIVE_CAP = 22;

const ALL = ['jelly', 'piranha', 'urchin', 'puffer', 'shark'];

export const WAVES = [
  null,
  { name: 'Calm Shallows', budget: 7, types: ALL.slice(0, 1), span: 20, hint: 'Swing the anchor through them. Speed is damage.' },
  { name: 'Snapping Waters', budget: 11, types: ALL.slice(0, 2), span: 24, hint: 'Snappers flash before they dart. Sidestep, then swat.' },
  { name: 'Spiny Reef', budget: 15, types: ALL.slice(0, 3), span: 26, hint: 'Urchins burst into spines when sunk. Mind the ring.' },
  { name: 'Puffer Cove', budget: 20, types: ALL.slice(0, 4), span: 28, hint: 'Bat a puffer’s spines back with a fast swing.' },
  { name: 'Shark Alley', budget: 26, types: ALL, span: 30, hint: 'Sharks charge in a line. Dodge, then hit the dazed.' },
  { name: 'Riptide', budget: 32, types: ALL, span: 32, hint: 'Slam (click) clears a crowd. Surge (space) clears a swarm.' },
  { name: 'Black Currents', budget: 40, types: ALL, span: 34, hint: 'Keep your combo alive: chains multiply the score.' },
  { name: 'The Abyss Stirs', budget: 48, types: ALL, span: 36, hint: 'Something enormous is waking below.' },
  { name: 'Heart of the Abyss', boss: true, types: [], span: 0, hint: 'Dodge the red circles. Hit the body.' },
];

const TYPE_WEIGHT = { jelly: 5, piranha: 2.2, urchin: 2, puffer: 2, shark: 1.2 };

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
    const { rng } = this.world;
    const def = WAVES[wave];
    this.wave = wave;
    this.clock = 0;
    this.schedule = [];
    this.total = 0;
    if (def.boss) {
      this.schedule.push({ time: 0.2, type: 'kraken', count: 1 });
      this.total = 1;
      return;
    }

    const newest = def.types[def.types.length - 1];
    let remaining = def.budget;
    const events = [];
    while (remaining > 0) {
      const options = def.types.filter((type) => ENEMY_COST[type].cost <= remaining);
      if (options.length === 0) break;
      const entries = options.map((type) => ({
        value: type,
        weight: TYPE_WEIGHT[type] * (type === newest && wave > 1 ? 1.8 : 1),
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
      if (event.type !== 'kraken' && world.enemies.length + event.count > ALIVE_CAP) break;
      this.schedule.shift();
      this.spawn(event);
    }
  }

  spawn(event) {
    const { world } = this;
    if (event.type === 'kraken') {
      world.spawnEnemy('kraken', W / 2, -180);
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
