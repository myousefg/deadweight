// Shared setup for the headless tests: just enough of a browser for the game's modules to load
// (they only touch the DOM when drawing), and a couple of helpers that play the real simulation.

import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const stubContext = new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = {
  createElement: () => ({ getContext: () => stubContext, width: 0, height: 0 }),
  addEventListener() {},
  hidden: false,
};
globalThis.addEventListener = () => {};

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'game', 'src');

/** Import a game module by its path under game/src. */
export const load = (path) => import(pathToFileURL(join(SRC, path)).href);

const [{ World }, { createAutopilot }, { STEP }, { rollChoices, applyUpgrade }, { isRegionStart, regionIndexOf, REGIONS }, contracts] = await Promise.all([
  load('world.js'), load('autopilot.js'), load('config.js'), load('upgrades.js'), load('regions.js'), load('contracts.js'),
]);

export { World, createAutopilot, STEP };

/** Run the world with the autopilot until the wave ends; returns the state it ended in. */
export function playWave(world, pilot, wave, maxSeconds = 300) {
  if (world.wave !== wave) world.startWave(wave);
  for (let t = 0; t < maxSeconds; t += STEP) {
    world.update(STEP, pilot(world, STEP));
    if (world.state === 'cleared' || world.state === 'won' || world.state === 'lost') break;
  }
  return world.state;
}

/** A sensible harbor visit: take the first card and mend a ring while the purse allows. */
export function harborVisit(world) {
  const choices = rollChoices(world.rng, world.build, 3);
  if (choices.length) applyUpgrade(world.build, world.boat, choices[0]);
  while (world.boat.hp < world.boat.maxHp && world.purse >= 30) {
    world.purse -= 30;
    world.boat.heal(1);
  }
  world.pickups.length = 0;
  world.projectiles.length = 0;
}

/**
 * Sail a whole voyage with the autopilot, taking the first contract offered in each region.
 * Returns { world, result, waves } where result is 'won', 'lost' or 'cleared' (ran out of waves).
 */
export function sailVoyage(seed, { endless = false, lastWave = 12, stormy = false, talents = {} } = {}) {
  const world = new World({ seed, endless, talents });
  const pilot = createAutopilot();
  let result = 'cleared';
  let waves = 0;
  for (let wave = 1; wave <= lastWave; wave += 1) {
    if (isRegionStart(wave)) {
      world.stormy = stormy;
      contracts.takeContract(world, contracts.offerContracts(world.rng, REGIONS[regionIndexOf(wave)].id)[0]);
    }
    const state = playWave(world, pilot, wave);
    waves = wave;
    if (state === 'won') { result = 'won'; break; }
    if (state !== 'cleared') { result = 'lost'; break; }
    harborVisit(world);
  }
  return { world, result, waves };
}
