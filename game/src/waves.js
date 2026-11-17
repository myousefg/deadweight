// The wave table and the director that turns a wave's budget into a schedule of spawns.
// Nine waves in three regions: two ordinary waves, then that region's boss.

import { W, H } from './config.js';
import { ENEMY_COST } from './enemies/index.js';

export const FINAL_WAVE = 9;
const ALIVE_CAP = 22;
/** How many more creatures a stormy sea brings. */
const STORM_BUDGET = 1.3;

const ALL = ['jelly', 'piranha', 'urchin', 'puffer', 'shark'];

export const WAVES = [
  null,
  { name: 'Calm Shallows', budget: 7, types: ALL.slice(0, 1), span: 20, hint: 'Swing the anchor through them. Speed is damage.' },
  { name: 'Snapping Waters', budget: 11, types: ALL.slice(0, 2), span: 24, hint: 'Snappers flash before they dart. Sidestep, then swat.' },
  { name: 'Crab Rock', boss: 'colossus', hint: 'Its armour turns blows aside. Dash through the shockwave; hit it when dazed.' },
  { name: 'Tangled Fronds', budget: 16, types: ALL.slice(0, 3), span: 26, hint: 'Kelp slows boats and fish. Urchins burst into spines.' },
  { name: 'Puffer Cove', budget: 22, types: ALL.slice(0, 4), span: 28, hint: 'Bat a puffer’s spines back with a fast swing.' },
  { name: 'The Queen’s Channel', boss: 'eel', hint: 'Hit any part of her body. Dodge the blue circles and the red sweeps.' },
  { name: 'Shark Alley', budget: 30, types: ALL, span: 30, hint: 'Whirlpools drag you in. Sharks charge in a line.' },
  { name: 'Black Currents', budget: 40, types: ALL, span: 34, hint: 'Keep your combo alive: chains multiply the score.' },
  { name: 'Heart of the Abyss', boss: 'kraken', hint: 'Dodge the red circles. Hit the body.' },
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
    const { rng, stormy } = this.world;
    const def = WAVES[wave];
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
    let remaining = Math.round(def.budget * (stormy ? STORM_BUDGET : 1));
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
      if (!event.boss && world.enemies.length + event.count > ALIVE_CAP) break;
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
