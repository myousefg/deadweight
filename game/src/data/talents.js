// The workshop: permanent upgrades bought with salvage between voyages. Each talent has a few
// levels; levels you own are applied to the build of every new run (see applyTalents).

export const TALENTS = [
  {
    id: 'keel', name: 'Sturdy Keel', icon: 'heart', costs: [250, 650],
    text: '+1 life ring at the start of every voyage.',
  },
  {
    id: 'pockets', name: 'Deep Pockets', icon: 'pearl', costs: [120, 260, 450],
    text: 'Start every voyage with 25 more pearls.',
  },
  {
    id: 'flukes', name: 'Honed Flukes', icon: 'anchor', costs: [200, 420, 800],
    text: '+6% blow damage on every hit.',
  },
  {
    id: 'tidewise', name: 'Tidewise', icon: 'wave', costs: [300, 700],
    text: 'Each wave begins with the Tide Surge 30% charged.',
  },
  {
    id: 'bounty', name: 'Bounty Hunter', icon: 'crate', costs: [180, 380, 700],
    text: '+15% salvage from every voyage.',
  },
  {
    id: 'bane', name: 'Boss Bane', icon: 'skull', costs: [400, 900],
    text: '+10% damage against bosses.',
  },
  {
    id: 'reader', name: 'Wind Reader', icon: 'wind', costs: [220, 520],
    text: '+5% sailing speed and a quicker dash.',
  },
  {
    id: 'haggler', name: 'Haggler', icon: 'coin', costs: [350],
    text: 'The first card reroll at every harbor is free.',
  },
  {
    id: 'stormsense', name: 'Storm Sense', icon: 'cloud', costs: [600],
    text: 'Stormy seas pay x1.75 score instead of x1.5.',
  },
];

export const talentById = (id) => TALENTS.find((talent) => talent.id === id);
export const maxLevel = (talent) => talent.costs.length;
export const totalLevels = () => TALENTS.reduce((sum, talent) => sum + maxLevel(talent), 0);

/** Apply the owned talent levels (an { id: level } map) to a fresh world before its first wave. */
export function applyTalents(world, levels = {}) {
  const level = (id) => levels[id] || 0;
  const { build, boat } = world;
  boat.maxHp += level('keel');
  boat.hp = boat.maxHp;
  world.purse += 25 * level('pockets');
  build.damage *= 1 + 0.06 * level('flukes');
  world.tideHead = 0.3 * level('tidewise');
  build.bossDamage *= 1 + 0.1 * level('bane');
  build.speed *= 1 + 0.05 * level('reader');
  build.dashCooldown *= 1 - 0.08 * level('reader');
  world.freeReroll = level('haggler');
  world.stormBonus = 0.25 * level('stormsense');
}
