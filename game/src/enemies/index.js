// The roster: every enemy kind by id, split into the seven ordinary creatures and the four
// bosses, plus what each ordinary kind costs the wave budget.

import { jelly } from './creatures/jelly.js';
import { piranha } from './creatures/piranha.js';
import { urchin } from './creatures/urchin.js';
import { puffer } from './creatures/puffer.js';
import { shark } from './creatures/shark.js';
import { manta } from './creatures/manta.js';
import { angler } from './creatures/angler.js';
import { colossus } from './bosses/colossus.js';
import { eel } from './bosses/eel.js';
import { admiral } from './bosses/admiral.js';
import { kraken } from './bosses/kraken.js';

/** Ordinary creatures in the order the voyage introduces them. */
export const CREATURES = [jelly, piranha, urchin, puffer, shark, manta, angler];
/** One boss per region, in voyage order. */
export const BOSSES = [colossus, eel, admiral, kraken];

export const ENEMY_TYPES = { jelly, piranha, urchin, puffer, shark, manta, angler, colossus, eel, admiral, kraken };

/** Budget points each ordinary kind spends when a wave is composed, and how many spawn at once. */
export const ENEMY_COST = {
  jelly: { cost: 1, pack: 1 },
  piranha: { cost: 3, pack: 4 },
  urchin: { cost: 2, pack: 1 },
  puffer: { cost: 3, pack: 1 },
  shark: { cost: 5, pack: 1 },
  manta: { cost: 4, pack: 1 },
  angler: { cost: 5, pack: 1 },
};
