// Screenshot scenes behind ?shot=start|play|harbor|end|chart|dock. Each one plays the real game
// forward with the autopilot (see autopilot.js) and stops on a good frame, so the picture is what
// a short run of the actual code produces and the same seed always gives the same frame.

import { STEP } from './config.js';
import { createAutopilot } from './autopilot.js';
import { FINAL_WAVE } from './waves.js';
import { applyUpgrade, rollChoices, upgradeById } from './upgrades.js';

const MAX_WAVE_SECONDS = 200;

function giveBuild(world, ids) {
  for (const id of ids) applyUpgrade(world.build, world.boat, upgradeById(id));
}

/** A fresh run with its first wave begun, as the sea chart does when the player sets sail. */
function beginRun(game, seed) {
  const world = game.newRun(seed);
  world.startWave(1);
  return world;
}

/** Run one wave to its end (cleared, won or lost) with the autopilot; returns the final state. */
function playWave(world, pilot, wave) {
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

/** How good a frame this is for a screenshot: a boss on screen, strikes coming, the anchor mid-blow. */
function frameScore(world) {
  if (world.state !== 'fight' || world.effects.hurt > 0.02 || world.boat.invuln > 0) return -1;
  const boss = world.enemies.find((enemy) => enemy.boss);
  const onScreen = (part) => part.x > 30 && part.x < 1250 && part.y > 110 && part.y < 690;
  const parts = boss && boss.parts ? boss.parts.filter(onScreen).length : boss ? 1 : 0;
  const telegraphs = world.hazards.filter((hazard) => hazard.kind === 'slam' && !hazard.struck).length;
  const tier = world.anchor.tier;
  const near = boss && boss.parts
    ? Math.min(...boss.parts.map((part) => Math.hypot(part.x - world.boat.x, part.y - world.boat.y)))
    : 999;
  return parts * 2
    + Math.min(telegraphs, 3) * 4
    + (tier >= 3 ? 6 : tier === 2 ? 4 : tier === 1 ? 1 : 0)
    + (near < 260 ? 4 : 0)
    + (boss && boss.state === 'coil' ? 5 : 0)
    + Math.min(world.particles.list.length, 300) / 60;
}

const WARMUP_STEPS = Math.round(9 / STEP);
const SCAN_STEPS = Math.round(14 / STEP);

function startPlayRun(game, seed) {
  const world = beginRun(game, seed);
  giveBuild(world, ['heavy', 'heavy', 'chain', 'splash', 'lightning', 'hull', 'spring']);
  world.wave = 5;
  world.stats.score = 19800;
  world.stats.bosses = 1;
  world.stormy = true;
  world.startWave(6);
  return world;
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
  let best = { score: -1, step: 0 };
  advance(world, pilot, SCAN_STEPS, (step) => {
    const score = frameScore(world);
    if (score > best.score) best = { score, step };
  });
  world = startPlayRun(game, seed);
  pilot = createAutopilot();
  advance(world, pilot, WARMUP_STEPS + best.step + 1);
  game.switchTo('play');
}

function stageHarbor(game, seed) {
  const world = beginRun(game, seed);
  world.godMode = true;
  const pilot = createAutopilot();
  giveBuild(world, ['heavy']);
  for (let wave = 1; wave <= 3; wave += 1) {
    if (playWave(world, pilot, wave) !== 'cleared') break;
    if (wave < 3) harborVisit(world);
  }
  world.godMode = false;
  world.purse = Math.max(world.purse, 38);
  game.switchTo('harbor');
  // Let the cards slide in and old popups fade, then rest the cursor on the middle card.
  const total = 3 * 300 + 2 * 34;
  game.input.mouse.x = (1280 - total) / 2 + 334 + 150;
  game.input.mouse.y = 330;
  game.advance(1.6);
}

function stageEnd(game, seed) {
  const world = beginRun(game, seed);
  const pilot = createAutopilot();
  for (let wave = 1; wave <= FINAL_WAVE; wave += 1) {
    const result = playWave(world, pilot, wave);
    if (result === 'won' || result === 'lost') break;
    harborVisit(world);
  }
  for (let t = 0; t < 8 && world.state !== 'won' && world.state !== 'lost'; t += STEP) world.update(STEP, pilot(world, STEP));
  game.finishRun(world, world.state === 'won');
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
  } else if (name === 'chart') {
    beginRun(game, seed);
    game.run.world.wave = 3;
    game.switchTo('chart');
    game.advance(0.6);
  } else if (name === 'dock') {
    game.progress.data.salvage = Math.max(game.progress.data.salvage, 1000);
    game.switchTo('dock');
    game.advance(0.6);
  }
  game.controlOverride = null;
  game.fade = 0;
  game.frozen = true;
}
