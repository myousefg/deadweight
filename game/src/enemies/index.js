// The roster: every enemy kind by id, plus what each costs the wave budget and when it appears.

import { jelly } from './jelly.js';
import { piranha } from './piranha.js';
import { urchin } from './urchin.js';
import { puffer } from './puffer.js';
import { shark } from './shark.js';
import { kraken } from './kraken.js';

export const ENEMY_TYPES = { jelly, piranha, urchin, puffer, shark, kraken };

/** Budget points each kind spends when a wave is composed, and how many spawn at once. */
export const ENEMY_COST = {
  jelly: { cost: 1, pack: 1 },
  piranha: { cost: 3, pack: 4 },
  urchin: { cost: 2, pack: 1 },
  puffer: { cost: 3, pack: 1 },
  shark: { cost: 5, pack: 1 },
};
