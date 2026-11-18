// Headless tests: they load the real game modules and play the real simulation, no browser needed.
// Run with:  node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';
import { load, World, createAutopilot, STEP, sailVoyage } from './helpers.mjs';

const { regionIndexOf, isBossWave, isRegionStart, lapOf, REGIONS, REGION_COUNT } = await load('data/regions.js');
const { WAVES, waveDef, FINAL_WAVE } = await load('data/waves.js');
const { ENEMY_TYPES, ENEMY_COST } = await load('enemies/index.js');
const { Progress, salvageFor } = await load('save/progress.js');
const { TALENTS, maxLevel, totalLevels } = await load('data/talents.js');
const { MEDALS, awardMedals } = await load('data/medals.js');
const { CONTRACTS, offerContracts } = await load('data/contracts.js');
const { takeContract, updateContract, resolveContract } = await load('sim/contract-tracker.js');
const { createMine, updateMines } = await load('sim/mines.js');
const { UPGRADES, applyUpgrade, upgradeById, rollChoices } = await load('data/upgrades.js');
const { createRng } = await load('core/random.js');

test('the voyage is four regions of three waves, each ending in its own boss', () => {
  assert.equal(REGION_COUNT, 4);
  assert.equal(FINAL_WAVE, 12);
  for (let wave = 1; wave <= FINAL_WAVE; wave += 1) {
    assert.equal(isBossWave(wave), wave % 3 === 0);
    assert.equal(isRegionStart(wave), wave % 3 === 1);
    assert.equal(!!WAVES[wave].boss, isBossWave(wave), `wave ${wave} boss flag`);
    if (isBossWave(wave)) assert.equal(WAVES[wave].boss, REGIONS[regionIndexOf(wave)].boss);
  }
  assert.deepEqual(REGIONS.slice(1).map((region) => region.boss), ['colossus', 'eel', 'admiral', 'kraken']);
});

test('every creature in the wave table exists and costs budget', () => {
  for (const def of WAVES.slice(1)) {
    for (const type of def.types || []) {
      assert.ok(ENEMY_TYPES[type], `${type} is a known creature`);
      assert.ok(ENEMY_COST[type].cost > 0);
    }
    if (def.boss) assert.ok(ENEMY_TYPES[def.boss].boss, `${def.boss} is a boss`);
  }
});

test('the Deep Dive laps the regions and grows the budget but not the boss waves', () => {
  assert.equal(regionIndexOf(13), 1);
  assert.equal(regionIndexOf(24), 4);
  assert.equal(lapOf(12), 0);
  assert.equal(lapOf(13), 1);
  assert.ok(waveDef(14).budget > waveDef(2).budget);
  assert.equal(waveDef(15).boss, 'colossus');
});

test('a full voyage plays through with no errors and all four bosses fall', () => {
  // Seed 2 is a known winner for the autopilot; the sim is deterministic so this is stable.
  const { world, result } = sailVoyage(2);
  assert.equal(result, 'won');
  assert.deepEqual(world.stats.bossIds, ['colossus', 'eel', 'admiral', 'kraken']);
  assert.ok(world.stats.score > 20000);
  assert.ok(world.stats.mines > 0, 'the Sunken Fleet mines were set off');
});

test('the simulation is deterministic for a seed', () => {
  const a = sailVoyage(3, { lastWave: 5 });
  const b = sailVoyage(3, { lastWave: 5 });
  assert.equal(a.world.stats.score, b.world.stats.score);
  assert.equal(a.world.stats.kills, b.world.stats.kills);
});

test('the Deep Dive carries on after the Kraken falls', () => {
  const { world, waves } = sailVoyage(2, { endless: true, lastWave: 14 });
  assert.equal(waves, 14);
  assert.ok(world.stats.bossIds.includes('kraken'));
  assert.equal(world.state, 'cleared');
  assert.ok(world.bossScale === 1 + 0.55, 'second lap bosses are tougher');
});

test('each boss and creature can be spawned and updated for a few seconds', () => {
  for (const type of Object.keys(ENEMY_TYPES)) {
    const world = new World({ seed: 9 });
    world.startWave(1);
    world.director.schedule.length = 0;
    world.state = 'fight';
    world.spawnEnemy(type, 640, 200);
    world.godMode = true;
    for (let t = 0; t < 6 / STEP; t += 1) world.update(STEP, createAutopilot()(world, STEP));
    assert.ok(world.enemies.every((enemy) => Number.isFinite(enemy.x) && Number.isFinite(enemy.y)), `${type} stays finite`);
  }
});

test('a mine blows up the creatures next to it when the anchor swats it', () => {
  const world = new World({ seed: 4 });
  world.startWave(7);
  world.mines.length = 0;
  world.director.schedule.length = 0;
  world.state = 'fight';
  const mine = createMine(world, 900, 400);
  world.mines.push(mine);
  const fish = world.spawnEnemy('jelly', 930, 410);
  world.boat.x = 200;
  world.boat.y = 600;
  world.anchor.tier = 2;
  world.anchor.x = 900;
  world.anchor.y = 400;
  updateMines(world, STEP);
  assert.equal(world.mines.length, 0);
  assert.ok(fish.dead || fish.hp < fish.maxHp, 'the jelly took the blast');
  assert.equal(world.stats.mines, 1);
});

test('a mine hurts the boat that bumps into it', () => {
  const world = new World({ seed: 4 });
  world.startWave(7);
  world.mines.length = 0;
  world.state = 'fight';
  world.mines.push(createMine(world, 500, 500));
  world.boat.x = 500;
  world.boat.y = 500;
  const before = world.boat.hp;
  updateMines(world, STEP);
  assert.equal(world.boat.hp, before - 1);
});

test('talents cost salvage, stack up to their level and apply to a new run', () => {
  const progress = new Progress();
  progress.volatile = true;
  progress.data.salvage = 1000;
  assert.equal(progress.buyTalent('keel'), '');
  assert.equal(progress.buyTalent('keel'), '');
  assert.equal(progress.buyTalent('keel'), 'maxed');
  assert.equal(progress.talentLevel('keel'), 2);
  assert.equal(progress.salvage, 1000 - 250 - 650);
  assert.equal(progress.buyTalent('stormsense'), 'poor');
  const world = new World({ seed: 1, talents: progress.data.talents });
  assert.equal(world.boat.maxHp, 7);
  assert.equal(world.boat.hp, 7);
  assert.equal(TALENTS.reduce((sum, talent) => sum + maxLevel(talent), 0), totalLevels());
});

test('salvage rewards score, bosses, a win, contracts and the bounty talent', () => {
  const stats = { score: 15000, bosses: 2, contractSalvage: 100 };
  assert.equal(salvageFor(stats, false), 100 + 240 + 100);
  assert.equal(salvageFor(stats, true), 100 + 240 + 150 + 100);
  assert.equal(salvageFor(stats, false, 2), Math.round(440 * 1.3));
});

test('medals are awarded once and only when their condition is met', () => {
  const progress = new Progress();
  progress.volatile = true;
  const world = new World({ seed: 1 });
  world.stats.kills = 45;
  world.stats.bestCombo = 30;
  const first = awardMedals(progress, world, false).map((medal) => medal.id);
  assert.ok(first.includes('deckhand') && first.includes('combo'));
  assert.ok(!first.includes('kraken'));
  assert.deepEqual(awardMedals(progress, world, false), []);
  const won = awardMedals(progress, world, true).map((medal) => medal.id);
  // A win with almost no hits taken earns Ghost of the Sea alongside Kraken Slayer.
  assert.deepEqual(won.sort(), ['ghost', 'kraken']);
  assert.equal(new Set(MEDALS.map((medal) => medal.id)).size, MEDALS.length);
});

test('a count contract pays out once and an end-of-region contract is judged at the boss', () => {
  const world = new World({ seed: 1 });
  const slam = CONTRACTS.find((contract) => contract.id === 'slam');
  takeContract(world, slam);
  world.stats.slams = 8;
  updateContract(world);
  updateContract(world);
  assert.equal(world.stats.contracts, 1);
  assert.equal(world.stats.contractSalvage, slam.reward);

  const clean = CONTRACTS.find((contract) => contract.id === 'clean');
  takeContract(world, clean);
  updateContract(world);
  resolveContract(world);
  assert.equal(world.stats.contracts, 2, 'no hits taken: clean sweep pays');
  takeContract(world, clean);
  world.stats.hits += 1;
  updateContract(world);
  assert.ok(world.contract.failed);
  resolveContract(world);
  assert.equal(world.stats.contracts, 2, 'a failed contract pays nothing');
});

test('contract offers are distinct and respect region-only jobs', () => {
  const rng = createRng(5);
  for (let i = 0; i < 20; i += 1) {
    const offers = offerContracts(rng, 'shallows');
    assert.equal(new Set(offers.map((offer) => offer.id)).size, 3);
    assert.ok(offers.every((offer) => !offer.only));
  }
  const fleetOffers = new Set();
  for (let i = 0; i < 60; i += 1) offerContracts(rng, 'fleet').forEach((offer) => fleetOffers.add(offer.id));
  assert.ok(fleetOffers.has('bomber'));
});

test('every upgrade card applies cleanly and respects its level cap', () => {
  const world = new World({ seed: 8 });
  for (const upgrade of UPGRADES) {
    for (let level = 0; level < upgrade.max; level += 1) applyUpgrade(world.build, world.boat, upgrade);
  }
  assert.equal(rollChoices(createRng(1), world.build, 3).length, 0, 'a maxed build has nothing left to offer');
  assert.ok(world.build.thunder > 0 && world.build.reaper > 0 && world.build.armor > 0);
  assert.ok(upgradeById('gilded'));
});

test('the content manifest counts every table the game ships with', async () => {
  const { CONTENT } = await load('data/content.js');
  const { counts } = CONTENT;
  assert.deepEqual(
    { ...counts },
    { regions: 4, waves: 12, creatures: 7, bosses: 4, upgrades: 17, anchors: 4, talents: 9, talentLevels: 19, medals: 18, contracts: 9 },
  );
  assert.equal(counts.talentLevels, totalLevels());
  assert.equal(CONTENT.regions.length, counts.regions);
  assert.equal(CONTENT.medals, MEDALS);
  assert.deepEqual(CONTENT.bosses.map((boss) => boss.id), ['colossus', 'eel', 'admiral', 'kraken']);
  assert.ok(CONTENT.bosses.every((boss) => boss.boss) && CONTENT.creatures.every((kind) => !kind.boss));
  assert.ok(Object.isFrozen(CONTENT) && Object.isFrozen(counts));
});
