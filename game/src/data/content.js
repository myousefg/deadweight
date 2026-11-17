// Everything the game contains, in one place: regions and bosses, creatures, upgrades, anchors,
// workshop talents, medals and bounty contracts. The title screen reads its numbers from here, so
// what it advertises is always what the tables really hold.

import { REGIONS } from './regions.js';
import { WAVES, FINAL_WAVE } from './waves.js';
import { UPGRADES } from './upgrades.js';
import { ANCHOR_TYPES } from './anchor-types.js';
import { TALENTS, totalLevels } from './talents.js';
import { CONTRACTS } from './contracts.js';
import { MEDALS } from './medals.js';
import { ENEMY_TYPES } from '../enemies/index.js';

const creatures = Object.values(ENEMY_TYPES).filter((type) => !type.boss);
const bosses = Object.values(ENEMY_TYPES).filter((type) => type.boss);

export const CONTENT = {
  regions: REGIONS.slice(1),
  waves: WAVES.slice(1),
  creatures,
  bosses,
  upgrades: UPGRADES,
  anchors: ANCHOR_TYPES,
  talents: TALENTS,
  medals: MEDALS,
  contracts: CONTRACTS,
  counts: {
    regions: REGIONS.length - 1,
    waves: FINAL_WAVE,
    creatures: creatures.length,
    bosses: bosses.length,
    upgrades: UPGRADES.length,
    anchors: ANCHOR_TYPES.length,
    talents: TALENTS.length,
    talentLevels: totalLevels(),
    medals: MEDALS.length,
    contracts: CONTRACTS.length,
  },
};
