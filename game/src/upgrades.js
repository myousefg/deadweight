// The build: every stat the harbor upgrades can change, and the upgrade cards themselves.
// An upgrade is data plus one apply() function; the world only ever reads the build.

import { BOAT } from './config.js';

export function createBuild() {
  return {
    damage: 1,
    rope: 0,
    spring: 1,
    speed: 1,
    magnet: 1,
    surgeRate: 1,
    slamCooldown: 1,
    slamRadius: 1,
    dashCooldown: 1,
    anchorSize: 1,
    reflect: 0,
    splash: 0,
    lightning: 0,
    salvage: 0,
    armor: 0,
    gilded: 0,
    reaper: 0,
    thunder: 0,
    bossDamage: 1,
    levels: {},
  };
}

/** rarity: 'common' | 'rare' | 'epic' picks the card colour and how often it shows up. */
export const UPGRADES = [
  {
    id: 'heavy', name: 'Heavier Anchor', icon: 'anchor', rarity: 'common', max: 4,
    text: '+25% blow damage and a bigger anchor.',
    apply(build) { build.damage *= 1.25; build.anchorSize *= 1.08; },
  },
  {
    id: 'chain', name: 'Longer Chain', icon: 'chain', rarity: 'common', max: 4,
    text: '+35 chain reach for wider swings.',
    apply(build) { build.rope += 35; },
  },
  {
    id: 'spring', name: 'Quick Hands', icon: 'bolt', rarity: 'common', max: 3,
    text: 'The anchor answers the cursor 20% faster.',
    apply(build) { build.spring *= 1.2; },
  },
  {
    id: 'hull', name: 'Oak Hull', icon: 'ring', rarity: 'common', max: 4,
    text: '+1 life ring, and mend one right now.',
    apply(build, boat) { boat.maxHp = Math.min(BOAT.maxHpCap, boat.maxHp + 1); boat.hp = Math.min(boat.maxHp, boat.hp + 1); },
  },
  {
    id: 'rudder', name: 'Swift Rudder', icon: 'wind', rarity: 'common', max: 3,
    text: '+12% sailing speed.',
    apply(build) { build.speed *= 1.12; },
  },
  {
    id: 'magnet', name: 'Pearl Lure', icon: 'pearl', rarity: 'common', max: 3,
    text: 'Pearls fly to you from 40% farther away.',
    apply(build) { build.magnet *= 1.4; },
  },
  {
    id: 'tide', name: 'Tide Caller', icon: 'wave', rarity: 'common', max: 3,
    text: 'The Tide Surge charges 35% faster.',
    apply(build) { build.surgeRate *= 1.35; },
  },
  {
    id: 'slam', name: 'Earthshaker', icon: 'slam', rarity: 'common', max: 3,
    text: 'Slams cool down 22% faster and hit 18% wider.',
    apply(build) { build.slamCooldown *= 0.78; build.slamRadius *= 1.18; },
  },
  {
    id: 'dash', name: 'Second Wind', icon: 'dash', rarity: 'common', max: 3,
    text: 'Dash cooldown cut by 25%.',
    apply(build) { build.dashCooldown *= 0.75; },
  },
  {
    id: 'splash', name: 'Barbed Flukes', icon: 'spikes', rarity: 'rare', max: 3,
    text: 'Blows also hurt enemies near the target.',
    apply(build) { build.splash += 1; },
  },
  {
    id: 'reflect', name: 'Mirror Plating', icon: 'shield', rarity: 'rare', max: 2,
    text: 'Batted spines and ink come back for double damage.',
    apply(build) { build.reflect += 1; },
  },
  {
    id: 'lightning', name: 'Storm Chain', icon: 'storm', rarity: 'epic', max: 3,
    text: 'Sunk enemies may arc lightning to the nearest foes.',
    apply(build) { build.lightning += 1; },
  },
  {
    id: 'salvage', name: 'Salvage Crew', icon: 'crate', rarity: 'rare', max: 2,
    text: 'Mend one life ring at every harbor stop.',
    apply(build) { build.salvage += 1; },
  },
  {
    id: 'armor', name: 'Barnacle Plating', icon: 'shield', rarity: 'common', max: 3,
    text: 'You stay safe 30% longer after taking a hit.',
    apply(build) { build.armor += 1; },
  },
  {
    id: 'gilded', name: 'Gilded Pearls', icon: 'pearl', rarity: 'rare', max: 3,
    text: 'Pearls are worth 50% more score.',
    apply(build) { build.gilded += 1; },
  },
  {
    id: 'reaper', name: 'Reaper’s Edge', icon: 'skull', rarity: 'rare', max: 2,
    text: 'Small fry under 18% health sink at a touch.',
    apply(build) { build.reaper += 1; },
  },
  {
    id: 'thunder', name: 'Thunder Slam', icon: 'cloud', rarity: 'epic', max: 2,
    text: 'Slams call lightning down on the nearest foes.',
    apply(build) { build.thunder += 1; },
  },
];

const RARITY_WEIGHT = { common: 6, rare: 3, epic: 1.4 };

export function upgradeById(id) {
  return UPGRADES.find((upgrade) => upgrade.id === id);
}

export function levelOf(build, id) {
  return build.levels[id] || 0;
}

export function canTake(build, upgrade) {
  return levelOf(build, upgrade.id) < upgrade.max;
}

/** Roll `count` distinct upgrade choices the build can still take. */
export function rollChoices(rng, build, count = 3) {
  const pool = UPGRADES.filter((upgrade) => canTake(build, upgrade));
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const entries = pool.map((upgrade) => ({ value: upgrade, weight: RARITY_WEIGHT[upgrade.rarity] }));
    const pick = rng.weighted(entries);
    choices.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return choices;
}

export function applyUpgrade(build, boat, upgrade) {
  upgrade.apply(build, boat);
  build.levels[upgrade.id] = levelOf(build, upgrade.id) + 1;
}
