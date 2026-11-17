// Bounty contracts: before each region the sea chart offers three optional jobs. Take one and
// finish it inside that region to bank extra salvage. This file is the table of jobs and how each
// one is measured; sim/contract-tracker.js follows the one in play.

/**
 * kind 'count' contracts finish as soon as the goal is met; kind 'end' ones are judged when the
 * region's boss falls. measure() reads how far along the world is since the contract began.
 */
export const CONTRACTS = [
  {
    id: 'clean', name: 'Clean Sweep', icon: 'shield', kind: 'end', goal: 1, reward: 90,
    text: 'Clear the region without taking a single hit.',
    measure: (w, c) => (w.stats.hits === c.snap.hits ? 0 : -1),
    label: (c) => (c.value < 0 ? 'FAILED' : 'NO HITS YET'),
    passed: (w, c) => w.stats.hits === c.snap.hits,
  },
  {
    id: 'chain', name: 'Chain Gang', icon: 'chain', kind: 'count', goal: 12, reward: 70,
    text: 'Chain a x12 combo.',
    measure: (w, c) => c.bestCombo,
  },
  {
    id: 'bat', name: 'Return to Sender', icon: 'bolt', kind: 'count', goal: 5, reward: 70,
    text: 'Bat 5 spines, balls or ink back at the fleet.',
    measure: (w, c) => w.stats.reflected - c.snap.reflected,
  },
  {
    id: 'slam', name: 'Slam Dunk', icon: 'slam', kind: 'count', goal: 8, reward: 60,
    text: 'Land 8 anchor slams.',
    measure: (w, c) => w.stats.slams - c.snap.slams,
  },
  {
    id: 'harvest', name: 'Harvest Moon', icon: 'fish', kind: 'count', goal: 30, reward: 60,
    text: 'Sink 30 creatures.',
    measure: (w, c) => w.stats.kills - c.snap.kills,
  },
  {
    id: 'diver', name: 'Pearl Diver', icon: 'pearl', kind: 'count', goal: 25, reward: 60,
    text: 'Collect 25 pearls.',
    measure: (w, c) => w.stats.pearls - c.snap.pearls,
  },
  {
    id: 'surge', name: 'Tide Rider', icon: 'wave', kind: 'count', goal: 2, reward: 60,
    text: 'Unleash the Tide Surge twice.',
    measure: (w, c) => w.stats.surges - c.snap.surges,
  },
  {
    id: 'swift', name: 'Swift Passage', icon: 'hourglass', kind: 'end', goal: 150, reward: 80,
    text: 'Clear the region in under 2 minutes 30.',
    measure: (w, c) => w.stats.time - c.snap.time,
    label: (c) => (c.value > c.goal ? 'TOO SLOW' : `${Math.max(0, Math.ceil(c.goal - c.value))}s LEFT`),
    passed: (w, c) => w.stats.time - c.snap.time <= c.goal,
    fails: (c) => c.value > c.goal,
  },
  {
    id: 'bomber', name: 'Powder Monkey', icon: 'mine', kind: 'count', goal: 4, reward: 80, only: 'fleet',
    text: 'Set off 4 mines with your anchor or the fish.',
    measure: (w, c) => w.stats.mines - c.snap.mines,
  },
];

export const contractById = (id) => CONTRACTS.find((contract) => contract.id === id);

/** Three distinct contracts the region can offer. */
export function offerContracts(rng, regionId, count = 3) {
  const pool = CONTRACTS.filter((contract) => !contract.only || contract.only === regionId);
  const offers = [];
  while (offers.length < count && pool.length > 0) {
    const pick = rng.pick(pool);
    offers.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return offers;
}
