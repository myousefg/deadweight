// Contract tracking: a contract is a goal measured from the moment you sail, so the same run can
// carry a different job into every region. The jobs themselves are in data/contracts.js.

import { PALETTE } from '../core/config.js';
import { audio } from '../audio/engine.js';

/** Start tracking a contract from the numbers the run has now. */
export function takeContract(world, def) {
  const s = world.stats;
  world.contract = def
    ? {
      def,
      goal: def.goal,
      reward: def.reward,
      value: 0,
      bestCombo: 0,
      done: false,
      failed: false,
      snap: { hits: s.hits, reflected: s.reflected, slams: s.slams, kills: s.kills, pearls: s.pearls, surges: s.surges, mines: s.mines, time: s.time },
    }
    : null;
}

function pay(world, contract) {
  contract.done = true;
  world.stats.contracts += 1;
  world.stats.contractSalvage += contract.reward;
  audio.play('medal');
  world.effects.popup(`CONTRACT DONE  +${contract.reward} SALVAGE`, world.boat.x, world.boat.y - 80, { color: PALETTE.gold, size: 26, life: 2.2, rise: 40 });
}

/** Called every step: measure progress and pay out finished count contracts. */
export function updateContract(world) {
  const contract = world.contract;
  if (!contract || contract.done || contract.failed) return;
  contract.bestCombo = Math.max(contract.bestCombo, world.combo.count);
  contract.value = contract.def.measure(world, contract);
  if (contract.def.kind === 'count' && contract.value >= contract.goal) pay(world, contract);
  else if (contract.def.kind === 'end' && (contract.def.fails ? contract.def.fails(contract) : contract.value < 0)) contract.failed = true;
}

/** Called when a region's boss falls: judge the contracts that depend on how the region went. */
export function resolveContract(world) {
  const contract = world.contract;
  if (!contract || contract.done || contract.failed) return;
  if (contract.def.kind === 'end' && contract.def.passed(world, contract)) pay(world, contract);
  else if (!contract.done) contract.failed = true;
}

/** "7 / 12" style text and a 0..1 fraction for the HUD and chart. */
export function contractProgress(contract) {
  if (contract.done) return { text: 'DONE', fraction: 1 };
  if (contract.failed) return { text: 'FAILED', fraction: 0 };
  if (contract.def.label) return { text: contract.def.label(contract), fraction: contract.def.kind === 'end' ? 0.5 : 0 };
  const value = Math.max(0, Math.min(contract.goal, contract.value));
  return { text: `${Math.floor(value)} / ${contract.goal}`, fraction: value / contract.goal };
}
