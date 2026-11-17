// Screenshot scenes behind ?shot=start|play|harbor|end. Each one plays the real game forward with
// the autopilot (see autopilot.js) and stops on a good frame, so the picture is what a short run
// of the actual code produces and the same seed always gives the same frame.

import { STEP } from './config.js';
import { createAutopilot } from './autopilot.js';
import { FINAL_WAVE } from './waves.js';
import { applyUpgrade, rollChoices, upgradeById } from './upgrades.js';

const MAX_WAVE_SECONDS = 150;

function giveBuild(world, ids) {
  for (const id of ids) applyUpgrade(world.build, world.boat, upgradeById(id));
}

/** Run one wave to its end (cleared, won or lost) with the autopilot; returns the final state. */
function playWave(world, pilot, wave) {
  // A fresh run has already begun wave 1, exactly as a real new run does.
  if (world.wave !== wave) world.startWave(wave);
  for (let t = 0; t < MAX_WAVE_SECONDS; t += STEP) {
    world.update(STEP, pilot(world, STEP));
    if (world.state === 'cleared' || world.state === 'won' || world.state === 'lost') break;
  }
  return world.state;
}

/** What a sensible player does at the harbor: take the first card, mend if a ring is missing. */
function harborVisit(world) {
  const choices = rollChoices(world.rng, world.build, 3);
  if (choices.length) applyUpgrade(world.build, world.boat, choices[0]);
  while (world.boat.hp < world.boat.maxHp && world.purse >= 30) {
    world.purse -= 30;
    world.boat.heal(1);
  }
  world.pickups.length = 0;
  world.projectiles.length = 0;
}

/** How good a frame this is for a screenshot: a crowded sea, a hot combo, the anchor mid-blow. */
function frameScore(world) {
  if (world.state !== 'fight' || world.effects.hurt > 0.02 || world.boat.invuln > 0) return -1;
  const tier = world.anchor.tier;
  const { boat } = world;
  const onScreen = world.enemies.filter((e) => e.x > 40 && e.x < 1240 && e.y > 120 && e.y < 680);
  const near = onScreen.filter((e) => Math.hypot(e.x - boat.x, e.y - boat.y) < 330);
  const kinds = new Set(onScreen.map((e) => e.id)).size;
  return Math.min(onScreen.length, 12) * 1.2
    + near.length * 1.5
    + kinds * 2.5
    + Math.min(world.combo.count, 12) * 1.2
    + (tier >= 3 ? 7 : tier === 2 ? 5 : tier === 1 ? 1 : 0)
    + (world.projectiles.length > 0 ? 3 : 0)
    + world.zaps.length * 2
    + Math.min(world.particles.list.length, 300) / 60;
}

/** Seconds of ordinary play before the showcase pack arrives, and how long it is scanned for a frame. */
const WARMUP_STEPS = Math.round(9 / STEP);
const SCAN_STEPS = Math.round(5 / STEP);

function startPlayRun(game, seed) {
  const world = game.newRun(seed);
  giveBuild(world, ['heavy', 'heavy', 'chain', 'splash', 'lightning', 'hull', 'spring']);
  world.stats.score = 21800;
  world.startWave(7);
  return world;
}

/** Drop one of every creature onto the sea with the game's own spawn call, spread around the boat. */
function spawnShowcase(world) {
  const pack = [
    ['shark', 0.84, 0.3], ['puffer', 0.2, 0.3], ['urchin', 0.3, 0.8], ['urchin', 0.8, 0.76],
    ['jelly', 0.62, 0.2], ['jelly', 0.4, 0.2], ['jelly', 0.1, 0.62], ['jelly', 0.92, 0.55],
    ['piranha', 0.68, 0.84], ['piranha', 0.72, 0.87], ['piranha', 0.65, 0.88], ['piranha', 0.75, 0.82],
  ];
  for (const [type, fx, fy] of pack) world.spawnEnemy(type, fx * 1280, fy * 720);
}

/** The sim is deterministic, so find the best frame in one pass and replay to it in a second. */
function stagePlay(game, seed) {
  const advance = (world, pilot, steps, onStep) => {
    for (let step = 0; step < steps; step += 1) {
      world.update(STEP, pilot(world, STEP));
      if (onStep) onStep(step);
    }
  };
  let world = startPlayRun(game, seed);
  let pilot = createAutopilot();
  advance(world, pilot, WARMUP_STEPS);
  spawnShowcase(world);
  let best = { score: -1, step: 0 };
  advance(world, pilot, SCAN_STEPS, (step) => {
    const score = frameScore(world);
    if (step > 20 && score > best.score) best = { score, step };
  });
  world = startPlayRun(game, seed);
  pilot = createAutopilot();
  advance(world, pilot, WARMUP_STEPS);
  spawnShowcase(world);
  advance(world, pilot, best.step + 1);
  game.switchTo('play');
}

function stageHarbor(game, seed) {
  const world = game.newRun(seed);
  const pilot = createAutopilot();
  giveBuild(world, ['heavy']);
  for (let wave = 1; wave <= 3; wave += 1) {
    if (playWave(world, pilot, wave) !== 'cleared') break;
    if (wave < 3) harborVisit(world);
  }
  world.purse = Math.max(world.purse, 38);
  game.switchTo('harbor');
  // Let the cards slide in and old popups fade, then rest the cursor on the middle card.
  const total = 3 * 300 + 2 * 34;
  game.input.mouse.x = (1280 - total) / 2 + 334 + 150;
  game.input.mouse.y = 330;
  game.advance(1.6);
}

function stageEnd(game, seed) {
  const world = game.newRun(seed);
  const pilot = createAutopilot();
  for (let wave = 1; wave <= FINAL_WAVE; wave += 1) {
    const result = playWave(world, pilot, wave);
    if (result === 'won' || result === 'lost') break;
    harborVisit(world);
  }
  for (let t = 0; t < 8 && world.state !== 'won' && world.state !== 'lost'; t += STEP) world.update(STEP, pilot(world, STEP));
  game.run.newBest = game.saveBest(world.stats.score);
  game.switchTo(world.state === 'won' ? 'victory' : 'gameover');
  game.current.elapsed = 1.2;
}

/** A title-screen frame with several creatures close around the demo boat and the anchor swinging. */
function titleFrameScore(world) {
  const { boat } = world;
  const near = world.enemies.filter((e) => Math.hypot(e.x - boat.x, e.y - boat.y) < 260 && e.x > 650 && e.y > 80 && e.y < 690);
  const kinds = new Set(near.map((e) => e.id)).size;
  const centred = Math.hypot(boat.x - 930, boat.y - 450) / 60;
  return near.length * 2 + kinds * 2 + (world.anchor.tier >= 2 ? 4 : world.anchor.tier === 1 ? 1 : 0) - centred;
}

/** The demo is deterministic (fixed seed), so scan for the best moment, then replay to it. */
function stageTitle(game) {
  const scanSteps = Math.round(12 / STEP);
  game.switchTo('title');
  let best = { score: -1, step: 0 };
  for (let step = 0; step < scanSteps; step += 1) {
    game.update(STEP);
    const score = titleFrameScore(game.current.world);
    if (step > 180 && score > best.score) best = { score, step };
  }
  game.switchTo('title');
  for (let step = 0; step <= best.step; step += 1) game.update(STEP);
}

export function stageShot(game, name, seed = 1) {
  if (name === 'start') {
    stageTitle(game);
  } else if (name === 'play') {
    stagePlay(game, seed);
  } else if (name === 'harbor') {
    stageHarbor(game, seed);
  } else if (name === 'end') {
    stageEnd(game, seed);
  }
  game.controlOverride = null;
  game.fade = 0;
  game.frozen = true;
}
