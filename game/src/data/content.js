// The content manifest: one object that lists everything the game ships with, built from the data
// tables beside it. The game shell keeps it as game.content, so any screen can ask "how many
// regions, bosses, upgrades, talents, medals?" without reaching into the tables themselves.

import { REGIONS } from './regions.js';
import { WAVES } from './waves.js';
import { UPGRADES } from './upgrades.js';
import { ANCHOR_TYPES } from './anchor-types.js';
import { TALENTS, maxLevel } from './talents.js';
import { CONTRACTS } from './contracts.js';
import { MEDALS } from './medals.js';
import { CREATURES, BOSSES } from '../enemies/index.js';

const regions = REGIONS.filter(Boolean);
const waves = WAVES.filter(Boolean);
const talentLevels = TALENTS.reduce((sum, talent) => sum + maxLevel(talent), 0);

export const CONTENT = Object.freeze({
  regions,
  waves,
  creatures: CREATURES,
  bosses: BOSSES,
  upgrades: UPGRADES,
  anchors: ANCHOR_TYPES,
  talents: TALENTS,
  medals: MEDALS,
  contracts: CONTRACTS,
  counts: Object.freeze({
    regions: regions.length,
    waves: waves.length,
    creatures: CREATURES.length,
    bosses: BOSSES.length,
    upgrades: UPGRADES.length,
    anchors: ANCHOR_TYPES.length,
    talents: TALENTS.length,
    talentLevels,
    medals: MEDALS.length,
    contracts: CONTRACTS.length,
  }),
});
