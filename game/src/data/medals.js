// The captain's medals: milestones earned across runs. A medal is checked once, when a voyage
// ends, against the run's numbers and the saved career; new ones pop up on the results screen and
// stay on display in the dock's log.

import { ANCHOR_TYPES } from './anchor-types.js';
import { totalLevels } from './talents.js';

/**
 * check({ stats, won, endless, wave, progress }) is true when the medal is earned. `progress` is
 * the saved career *after* this run was banked.
 */
export const MEDALS = [
  { id: 'deckhand', name: 'Deckhand', icon: 'fish', text: 'Sink 40 creatures in one voyage.', check: ({ stats }) => stats.kills >= 40 },
  { id: 'crab', name: 'Crab Cracker', icon: 'anchor', text: 'Defeat the Hermit Colossus.', check: ({ progress }) => progress.bossesDown('colossus') > 0 },
  { id: 'eel', name: 'Eel Wrangler', icon: 'bolt', text: 'Defeat the Storm Eel Queen.', check: ({ progress }) => progress.bossesDown('eel') > 0 },
  { id: 'admiral', name: 'Admiral’s Bane', icon: 'flag', text: 'Defeat the Drowned Admiral.', check: ({ progress }) => progress.bossesDown('admiral') > 0 },
  { id: 'kraken', name: 'Kraken Slayer', icon: 'trophy', text: 'Win a voyage by sinking the Kraken.', check: ({ won, endless }) => won && !endless },
  { id: 'untouched', name: 'Untouchable', icon: 'shield', text: 'Clear a whole region without being hit.', check: ({ stats }) => stats.cleanRegions >= 1 },
  { id: 'ghost', name: 'Ghost of the Sea', icon: 'eye', text: 'Win a voyage taking 4 hits or fewer.', check: ({ stats, won, endless }) => won && !endless && stats.hits <= 4 },
  { id: 'stormrider', name: 'Storm Rider', icon: 'cloud', text: 'Clear two regions on stormy seas in one voyage.', check: ({ stats }) => stats.stormClears >= 2 },
  { id: 'combo', name: 'Unstoppable', icon: 'star', text: 'Reach a x25 combo.', check: ({ stats }) => stats.bestCombo >= 25 },
  { id: 'returner', name: 'Return to Sender', icon: 'spikes', text: 'Bat 15 projectiles back in one voyage.', check: ({ stats }) => stats.reflected >= 15 },
  { id: 'powder', name: 'Powder Monkey', icon: 'mine', text: 'Set off 8 mines in one voyage.', check: ({ stats }) => stats.mines >= 8 },
  { id: 'tidal', name: 'Tidal Force', icon: 'wave', text: 'Unleash the Tide Surge 4 times in one voyage.', check: ({ stats }) => stats.surges >= 4 },
  { id: 'contractor', name: 'Contractor', icon: 'medal', text: 'Finish 3 bounty contracts in one voyage.', check: ({ stats }) => stats.contracts >= 3 },
  { id: 'collector', name: 'Collector', icon: 'crate', text: 'Own all four anchors.', check: ({ progress }) => progress.owned >= ANCHOR_TYPES.length },
  { id: 'smith', name: 'Master Smith', icon: 'heart', text: 'Buy 12 talent levels in the workshop.', check: ({ progress }) => progress.talentTotal >= 12 },
  { id: 'diver', name: 'Deep Diver', icon: 'compass', text: 'Reach wave 16 in the Deep Dive.', check: ({ endless, wave }) => endless && wave >= 16 },
  { id: 'veteran', name: 'Old Salt', icon: 'boat', text: 'Finish 10 voyages.', check: ({ progress }) => progress.data.runs >= 10 },
  { id: 'rich', name: 'Pearl Hoarder', icon: 'pearl', text: 'Catch 120 pearls in one voyage.', check: ({ stats }) => stats.pearls >= 120 },
];

export const medalById = (id) => MEDALS.find((medal) => medal.id === id);
export const TALENT_TOTAL = totalLevels();

/** Award every medal this finished run earns; returns the newly earned ones. */
export function awardMedals(progress, world, won) {
  const context = {
    stats: world.stats, won, endless: world.endless, wave: world.wave, progress,
  };
  const earned = [];
  for (const medal of MEDALS) {
    if (progress.hasMedal(medal.id)) continue;
    if (medal.check(context)) {
      progress.grantMedal(medal.id);
      earned.push(medal);
    }
  }
  return earned;
}
