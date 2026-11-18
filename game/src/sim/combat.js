// Everything that happens when two things touch: the anchor's blows, slams, the tide surge, the
// boat taking damage, enemies dying and the combo and score that follow. world.js calls these once
// per step, after every body has moved. Bodies are tested part by part (see enemy.js), so a long
// serpent or a crab's claws are hit where they actually are.

import { ANCHOR, BOAT, COMBO, HIT_TIERS, PALETTE, SURGE } from '../core/config.js';
import { TAU, easeOutCubic } from '../core/math.js';
import { audio } from '../audio/engine.js';
import { nearestPart } from '../enemies/enemy.js';
import { spawnPearl, spawnLifeRing } from './pickups.js';

const ENEMY_COLORS = {
  jelly: PALETTE.pink,
  piranha: '#ff7a45',
  urchin: PALETTE.violet,
  puffer: '#ffd25a',
  shark: '#8fb0c4',
  kraken: '#b176f0',
  colossus: '#e2573c',
  eel: '#4aa3e8',
  admiral: '#7fe0d4',
  angler: '#3ec7b8',
  manta: '#5ac8fa',
};

/* ---------------------------------------------------------------- scoring */

export function comboMultiplier(world) {
  return 1 + Math.min(COMBO.maxBonus, Math.floor(world.combo.count / COMBO.perStep) * 0.5);
}

/** Stormy seas are a bet: more creatures, but every point counts half again as much. */
export function stormMultiplier(world) {
  return world.stormy ? 1.5 + (world.stormBonus || 0) : 1;
}

export function addScore(world, base, x, y, popup = true) {
  const gain = Math.round(base * comboMultiplier(world) * stormMultiplier(world));
  world.stats.score += gain;
  if (popup && gain > 0) world.effects.popup(`+${gain}`, x, y - 8, { size: 18 + Math.min(14, gain / 120) });
}

export function addTide(world, amount) {
  if (world.tide >= 1) return;
  world.tide = Math.min(1, world.tide + amount * world.build.surgeRate);
  if (world.tide >= 1) {
    audio.play('surgeReady');
    world.effects.popup('TIDE SURGE READY', world.boat.x, world.boat.y - 56, { color: PALETTE.mint, size: 24, life: 1.4 });
  }
}

function registerKill(world) {
  const { combo, stats } = world;
  combo.count += 1;
  combo.timer = COMBO.window;
  stats.bestCombo = Math.max(stats.bestCombo, combo.count);
  const milestones = { 5: 'KILLING SPREE', 10: 'RAMPAGE', 20: 'UNSTOPPABLE', 35: 'LEGEND OF THE DEEP' };
  if (milestones[combo.count]) {
    world.effects.popup(`${milestones[combo.count]}!`, world.boat.x, world.boat.y - 90, { color: PALETTE.gold, size: 32, life: 1.5 });
  }
}

/* ----------------------------------------------------------------- damage */

/** Hurt an enemy; returns true when the blow landed. `dir` is the unit push direction. */
export function damageEnemy(world, enemy, amount, dirX, dirY, knock, info = {}) {
  if (enemy.dead || enemy.invulnerable) return false;
  let dealt = amount * (enemy.damageTaken ?? 1);
  if (enemy.boss) dealt *= world.build.bossDamage;
  enemy.hp -= dealt;
  if (enemy.hp > 0 && !enemy.boss && world.build.reaper > 0 && enemy.hp <= enemy.maxHp * 0.18 * world.build.reaper) {
    enemy.hp = 0;
    if (world.rng.chance(0.25)) world.effects.popup('REAPED', enemy.x, enemy.y - enemy.r - 10, { color: PALETTE.violet, size: 20, life: 0.8 });
  }
  enemy.flash = 0.12;
  enemy.kx += dirX * knock;
  enemy.ky += dirY * knock;
  world.stats.damage += dealt;
  const color = ENEMY_COLORS[enemy.id] || PALETTE.foam;
  world.particles.splash(enemy.x, enemy.y, 3 + (info.tier || 1) * 2, color, 240);
  if (enemy.hp <= 0) killEnemy(world, enemy, info);
  return true;
}

export function killEnemy(world, enemy, info = {}) {
  if (enemy.dead) return;
  enemy.dead = true;
  const { def } = enemy;
  const color = ENEMY_COLORS[enemy.id] || PALETTE.foam;
  world.stats.kills += 1;
  if (!enemy.boss) {
    registerKill(world);
    addScore(world, def.score, enemy.x, enemy.y);
    addTide(world, 0.03);
    audio.play('kill', world.combo.count);
    world.effects.stop(0.025);
    world.effects.addShake(3);
    const count = world.rng.int(def.pearls[0], def.pearls[1]);
    for (let i = 0; i < count; i += 1) spawnPearl(world, enemy.x, enemy.y, 1);
    const lifeChance = 0.02 + (world.boat.hp <= 2 ? 0.05 : 0);
    if (def.score >= 100 && world.rng.chance(lifeChance)) spawnLifeRing(world, enemy.x, enemy.y);
  } else {
    world.stats.bosses += 1;
    world.stats.bossIds.push(enemy.id);
    addScore(world, def.score, enemy.x, enemy.y, false);
  }
  world.particles.splash(enemy.x, enemy.y, enemy.boss ? 60 : 16, color, enemy.boss ? 520 : 300);
  world.particles.ring(enemy.x, enemy.y, enemy.r * 0.4, enemy.r * 2.2, 0.45, color, 5);
  world.particles.foam(enemy.x, enemy.y, enemy.r * 0.9, 0.8);
  def.onDeath?.(enemy, world);
  if (!info.fromLightning) lightningArcs(world, enemy);
}

/** Storm Chain: a sunk enemy may throw lightning at the nearest living ones. */
function lightningArcs(world, source) {
  const level = world.build.lightning;
  if (level <= 0 || !world.rng.chance(0.28 + 0.14 * level)) return;
  const targets = world.enemies
    .filter((e) => !e.dead && e !== source && !e.invulnerable)
    .map((e) => ({ e, gap: nearestPart(e, source.x, source.y).gap }))
    .filter((entry) => entry.gap < 300)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 1 + level);
  for (const { e } of targets) {
    const hit = nearestPart(e, source.x, source.y).part;
    world.zaps.push({ x1: source.x, y1: source.y, x2: hit.x, y2: hit.y, life: 0.25, max: 0.25 });
    damageEnemy(world, e, 2 * world.build.damage, 0, 0, 0, { tier: 2, fromLightning: true });
  }
  if (targets.length) audio.play('reflect');
}

/** Thunder Slam: a slam's impact throws lightning at the nearest living foes beyond its ring. */
function thunderArcs(world, x, y) {
  const level = world.build.thunder;
  if (level <= 0) return;
  const targets = world.enemies
    .filter((e) => !e.dead && !e.invulnerable)
    .map((e) => ({ e, near: nearestPart(e, x, y) }))
    .filter((entry) => entry.near.gap < 420)
    .sort((a, b) => a.near.gap - b.near.gap)
    .slice(0, 2 + level);
  for (const { e, near } of targets) {
    world.zaps.push({ x1: x, y1: y, x2: near.part.x, y2: near.part.y, life: 0.3, max: 0.3 });
    damageEnemy(world, e, 2.5 * world.build.damage, 0, 0, 0, { tier: 2, fromLightning: true });
  }
  if (targets.length) audio.play('bolt');
}

export function hurtBoat(world, amount, fromX, fromY) {
  const { boat } = world;
  if (boat.invuln > 0 || boat.sinking || world.surge || world.state === 'won' || world.state === 'cleared') return false;
  if (world.godMode) {
    boat.invuln = 0.4;
    return false;
  }
  boat.hp -= amount;
  boat.invuln = BOAT.invulnerable * (1 + 0.3 * world.build.armor);
  const dx = boat.x - fromX;
  const dy = boat.y - fromY;
  const gap = Math.hypot(dx, dy) || 1;
  boat.vx += (dx / gap) * 520;
  boat.vy += (dy / gap) * 520;
  world.effects.hurt = 1;
  world.effects.addShake(14);
  world.effects.stop(0.09);
  world.particles.splash(boat.x, boat.y, 20, PALETTE.coral, 340);
  world.particles.ring(boat.x, boat.y, 14, 90, 0.4, PALETTE.red, 5);
  audio.play('hurt');
  world.stats.hits += 1;
  if (world.combo.count >= 3) world.effects.popup('COMBO LOST', boat.x, boat.y - 54, { color: PALETTE.coral, size: 22 });
  world.combo.count = 0;
  world.combo.timer = 0;
  if (boat.hp <= 0) {
    boat.hp = 0;
    boat.sinking = true;
    boat.sinkTime = 0;
    world.state = 'lost';
    world.stateTimer = 0;
    world.particles.splash(boat.x, boat.y, 50, PALETTE.foam, 460);
    audio.play('lose');
  }
  return true;
}

export function healBoat(world, amount, x, y) {
  const healed = world.boat.heal(amount);
  if (healed <= 0) return;
  audio.play('heal');
  world.effects.popup('+1 LIFE RING', x, y - 20, { color: PALETTE.mint, size: 22, life: 1.2 });
  world.particles.ring(world.boat.x, world.boat.y, 16, 80, 0.5, PALETTE.mint, 4);
}

export function collectPearl(world, pearl) {
  world.stats.pearls += pearl.value;
  world.purse += pearl.value;
  addScore(world, 10 * pearl.value * (1 + 0.5 * world.build.gilded), pearl.x, pearl.y, false);
  addTide(world, 0.07 * pearl.value);
  audio.play('pearl');
  world.particles.sparks(pearl.x, pearl.y, 0, TAU, 5, PALETTE.pearl, 160);
}

/* ------------------------------------------------------------- the anchor */

export function resolveAnchor(world) {
  const a = world.anchor;
  const { build } = world;
  const speed = a.speed;
  const tier = a.tier;

  for (const e of world.enemies) {
    if (e.dead) continue;
    const near = nearestPart(e, a.x, a.y);
    if (near.gap >= a.r) continue;

    if (tier > 0 && e.hitCd <= 0 && !e.invulnerable) {
      const nx = a.vx / speed;
      const ny = a.vy / speed;
      let amount = HIT_TIERS[tier - 1].damage * build.damage;
      if (e.stun > 0) amount *= 1.5;
      if (near.part.weak) amount *= near.part.weak;
      const knock = (240 + speed * 0.4) / e.def.mass;
      damageEnemy(world, e, amount, nx, ny, knock, { tier });
      e.hitCd = ANCHOR.hitCooldown;
      const slow = e.def.mass >= 3 ? 0.72 : 0.88;
      a.vx *= slow;
      a.vy *= slow;
      world.effects.stop(0.014 * (tier + 1));
      world.effects.addShake(1.5 + tier * 1.6);
      world.particles.sparks(near.part.x - nx * near.part.r * 0.6, near.part.y - ny * near.part.r * 0.6, Math.atan2(ny, nx), 1.4, 4 + tier * 3, HIT_TIERS[tier - 1].color);
      audio.play('hit', tier);
      if (tier === 3 && world.rng.chance(0.5)) {
        world.effects.popup('CRUSH!', near.part.x, near.part.y - near.part.r - 18, { color: PALETTE.coral, size: 26, life: 0.8 });
      }
      if (build.splash > 0) splashDamage(world, e, amount * 0.35 * build.splash, 60 + 24 * build.splash);
    } else if (e.def.mass < 10) {
      const dx = near.part.x - a.x;
      const dy = near.part.y - a.y;
      const gap = Math.hypot(dx, dy);
      if (gap > 0.001) {
        const push = (a.r - near.gap) * 0.35;
        e.x += (dx / gap) * push;
        e.y += (dy / gap) * push;
      }
    }
  }

  for (const p of world.projectiles) {
    if (p.friendly || p.dead) continue;
    const gap = Math.hypot(p.x - a.x, p.y - a.y);
    if (gap < a.r + p.r + 4 && speed > 200) {
      p.friendly = true;
      const nx = a.vx / speed;
      const ny = a.vy / speed;
      const pace = Math.max(460, Math.hypot(p.vx, p.vy) * 1.4);
      p.vx = nx * pace;
      p.vy = ny * pace;
      p.damage = 2 + build.reflect * 2;
      p.life = 3;
      audio.play('reflect');
      world.particles.sparks(p.x, p.y, Math.atan2(ny, nx), 1.2, 6, PALETTE.mint);
      world.stats.reflected += 1;
    }
  }
}

function splashDamage(world, origin, amount, radius) {
  for (const other of world.enemies) {
    if (other === origin || other.dead) continue;
    const near = nearestPart(other, origin.x, origin.y);
    if (near.gap < radius) {
      const gap = Math.hypot(near.part.x - origin.x, near.part.y - origin.y) || 1;
      damageEnemy(world, other, amount, (near.part.x - origin.x) / gap, (near.part.y - origin.y) / gap, 160 / other.def.mass, { tier: 1 });
    }
  }
}

/** The anchor lands after a lunge: a ring of force around the impact. */
export function slamImpact(world, x, y) {
  const { build } = world;
  const radius = ANCHOR.slamRadius * build.slamRadius;
  audio.play('slam');
  world.effects.addShake(10);
  world.effects.stop(0.07);
  world.stats.slams += 1;
  world.particles.splash(x, y, 28, PALETTE.foam, 440);
  world.particles.ring(x, y, radius * 0.25, radius, 0.45, PALETTE.foam, 7);
  world.particles.ring(x, y, radius * 0.1, radius * 0.75, 0.3, PALETTE.gold, 4);
  for (const e of world.enemies) {
    if (e.dead) continue;
    const near = nearestPart(e, x, y);
    if (near.gap < radius) {
      const dx = near.part.x - x;
      const dy = near.part.y - y;
      const gap = Math.hypot(dx, dy) || 1;
      const falloff = 1 - Math.min(1, Math.max(0, near.gap) / radius) * 0.4;
      damageEnemy(world, e, ANCHOR.slamDamage * build.damage * falloff, dx / gap, dy / gap, 560 / e.def.mass, { tier: 3 });
      e.hitCd = ANCHOR.hitCooldown;
    }
  }
  thunderArcs(world, x, y);
  for (const p of world.projectiles) {
    if (p.friendly) continue;
    if (Math.hypot(p.x - x, p.y - y) < radius) {
      p.dead = true;
      world.particles.sparks(p.x, p.y, 0, TAU, 5, PALETTE.foam, 200);
    }
  }
}

/* ----------------------------------------------------- boat and projectiles */

export function resolveBoat(world) {
  const { boat } = world;
  if (boat.sinking) return;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const near = nearestPart(e, boat.x, boat.y);
    if (near.gap < boat.r * 0.75) {
      const dx = boat.x - near.part.x;
      const dy = boat.y - near.part.y;
      const gap = Math.hypot(dx, dy) || 1;
      if (hurtBoat(world, e.def.contact, near.part.x, near.part.y) && !e.boss) {
        e.kx -= (dx / gap) * 260 / e.def.mass;
        e.ky -= (dy / gap) * 260 / e.def.mass;
      }
    }
  }
  for (const p of world.projectiles) {
    if (p.friendly || p.dead) continue;
    if (Math.hypot(boat.x - p.x, boat.y - p.y) < boat.r * 0.8 + p.r) {
      p.dead = true;
      hurtBoat(world, p.damage, p.x, p.y);
    }
  }
}

export function resolveFriendlyProjectiles(world) {
  for (const p of world.projectiles) {
    if (!p.friendly || p.dead) continue;
    for (const e of world.enemies) {
      if (e.dead || e.invulnerable) continue;
      if (nearestPart(e, p.x, p.y).gap < p.r) {
        const speed = Math.hypot(p.vx, p.vy) || 1;
        damageEnemy(world, e, p.damage * world.build.damage, p.vx / speed, p.vy / speed, 180 / e.def.mass, { tier: 2 });
        world.particles.sparks(p.x, p.y, 0, TAU, 6, PALETTE.mint);
        p.dead = true;
        break;
      }
    }
  }
}

/* ------------------------------------------------------------ tide surge */

export function tryStartSurge(world) {
  if (world.surge || world.tide < 1 || world.boat.sinking) return false;
  world.tide = 0;
  world.surgeCounter += 1;
  world.surge = { t: 0, id: world.surgeCounter };
  world.boat.invuln = Math.max(world.boat.invuln, SURGE.time + 0.35);
  audio.play('surge');
  world.effects.addShake(12);
  world.effects.flash = 0.6;
  world.stats.surges += 1;
  return true;
}

export function updateSurge(world, dt) {
  const surge = world.surge;
  if (!surge) return;
  surge.t += dt;
  const { boat } = world;
  const radius = SURGE.radius * easeOutCubic(Math.min(1, surge.t / SURGE.time));
  if (Math.random() < 0.8) {
    const angle = Math.random() * TAU;
    world.particles.foam(boat.x + Math.cos(angle) * radius, boat.y + Math.sin(angle) * radius, 14, 0.5);
  }
  for (const e of world.enemies) {
    if (e.dead || e.surgeId === surge.id) continue;
    const near = nearestPart(e, boat.x, boat.y);
    if (near.gap < radius) {
      e.surgeId = surge.id;
      const dx = near.part.x - boat.x;
      const dy = near.part.y - boat.y;
      const gap = Math.hypot(dx, dy) || 1;
      damageEnemy(world, e, SURGE.damage * world.build.damage, dx / gap, dy / gap, SURGE.push / e.def.mass, { tier: 2 });
    }
  }
  for (const p of world.projectiles) {
    if (p.friendly || p.dead) continue;
    if (Math.hypot(p.x - boat.x, p.y - boat.y) < radius) {
      p.dead = true;
      world.particles.sparks(p.x, p.y, 0, TAU, 4, PALETTE.mint, 200);
    }
  }
  if (surge.t >= SURGE.time) world.surge = null;
}
