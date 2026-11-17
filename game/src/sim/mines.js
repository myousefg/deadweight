// Drifting sea mines, the hazard of the Sunken Fleet. A mine blows when the boat bumps it, but it
// also blows when a creature or a fast anchor touches it, and the blast hurts every creature near
// it. Swat a mine from a safe distance, or lure a school (or a ghost ship) over one.

import { W, H, PALETTE } from '../core/config.js';
import { TAU } from '../core/math.js';
import { audio } from '../audio/engine.js';
import { nearestPart } from '../enemies/enemy.js';
import { regionOf, isBossWave } from '../data/regions.js';

const MINE_R = 21;
const BLAST_R = 140;
const BLAST_DAMAGE = 6;
const MAX_MINES = 9;

export function createMine(world, x, y) {
  const { rng } = world;
  return {
    x, y,
    vx: 0, vy: 0,
    r: MINE_R,
    bob: rng.range(0, TAU),
    fuse: -1,
    dead: false,
    age: 0,
    drift: rng.range(0, TAU),
  };
}

/** The mines floating in the sea when a wave begins. */
export function createMines(world, wave) {
  const mines = [];
  if (regionOf(wave).id !== 'fleet') return mines;
  const boss = isBossWave(wave);
  const count = boss ? 2 : wave % 3 === 1 ? 3 : 5;
  const { rng, boat } = world;
  for (let i = 0; i < count; i += 1) {
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const x = rng.range(150, W - 150);
      const y = rng.range(230, H - 90);
      if (Math.hypot(x - boat.x, y - boat.y) < 210) continue;
      if (mines.some((other) => Math.hypot(other.x - x, other.y - y) < 150)) continue;
      mines.push(createMine(world, x, y));
      break;
    }
  }
  return mines;
}

/** Lay one mine (the Admiral does this). Returns false when the sea is already full of them. */
export function layMine(world, x, y) {
  if (world.mines.length >= MAX_MINES) return false;
  world.mines.push(createMine(world, x, y));
  return true;
}

function detonate(world, mine, byPlayer) {
  if (mine.dead) return;
  mine.dead = true;
  world.stats.mines += byPlayer ? 1 : 0;
  audio.play('boom');
  world.effects.addShake(15);
  world.effects.stop(0.07);
  world.particles.splash(mine.x, mine.y, 36, '#ffb347', 520);
  world.particles.splash(mine.x, mine.y, 18, PALETTE.foam, 380);
  world.particles.ring(mine.x, mine.y, 20, BLAST_R * 1.15, 0.5, '#ffd27a', 8);
  world.particles.ring(mine.x, mine.y, 10, BLAST_R * 0.8, 0.32, '#ff6b57', 6);
  let sunk = 0;
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    const near = nearestPart(enemy, mine.x, mine.y);
    if (near.gap > BLAST_R) continue;
    const dx = near.part.x - mine.x;
    const dy = near.part.y - mine.y;
    const gap = Math.hypot(dx, dy) || 1;
    const before = enemy.dead;
    world.damageEnemy(enemy, BLAST_DAMAGE * (enemy.boss ? 1.3 : 1), dx / gap, dy / gap, 620 / enemy.def.mass, { tier: 3 });
    if (!before && enemy.dead) sunk += 1;
  }
  if (sunk >= 3) world.effects.popup('CHAIN BLAST!', mine.x, mine.y - 60, { color: PALETTE.gold, size: 34, life: 1.3 });
  else if (byPlayer) world.effects.popup('BOOM!', mine.x, mine.y - 50, { color: '#ffb347', size: 28, life: 0.9 });
  const { boat } = world;
  if (Math.hypot(boat.x - mine.x, boat.y - mine.y) < BLAST_R * 0.7) world.hurtBoat(1, mine.x, mine.y);
  for (const other of world.mines) {
    if (!other.dead && other.fuse < 0 && Math.hypot(other.x - mine.x, other.y - mine.y) < BLAST_R * 1.1) other.fuse = 0.18;
  }
}

export function updateMines(world, dt) {
  const { boat, anchor, mines } = world;
  for (const mine of mines) {
    if (mine.dead) continue;
    mine.age += dt;
    mine.bob += dt * 2.2;
    mine.drift += dt * 0.3;
    mine.x += Math.cos(mine.drift) * 9 * dt;
    mine.y += Math.sin(mine.drift * 1.3) * 7 * dt;
    mine.x = Math.min(W - 60, Math.max(60, mine.x));
    mine.y = Math.min(H - 50, Math.max(150, mine.y));
    if (mine.fuse >= 0) {
      mine.fuse -= dt;
      if (mine.fuse <= 0) detonate(world, mine, false);
      continue;
    }
    if (!boat.sinking && Math.hypot(boat.x - mine.x, boat.y - mine.y) < boat.r * 0.8 + mine.r) {
      detonate(world, mine, false);
      continue;
    }
    if (anchor.tier > 0 && Math.hypot(anchor.x - mine.x, anchor.y - mine.y) < anchor.r + mine.r) {
      detonate(world, mine, true);
      continue;
    }
    for (const enemy of world.enemies) {
      if (enemy.dead) continue;
      if (nearestPart(enemy, mine.x, mine.y).gap < mine.r - 2) {
        detonate(world, mine, true);
        break;
      }
    }
  }
  world.mines = mines.filter((mine) => !mine.dead);
}

export function drawMines(ctx, world) {
  for (const mine of world.mines) {
    const t = mine.age;
    const bob = Math.sin(mine.bob) * 3;
    ctx.save();
    ctx.translate(mine.x, mine.y + bob);
    ctx.fillStyle = 'rgba(2, 22, 32, 0.3)';
    ctx.beginPath();
    ctx.ellipse(5, 14 - bob, mine.r * 0.95, mine.r * 0.55, 0, 0, TAU);
    ctx.fill();

    const armed = mine.fuse >= 0;
    ctx.rotate(Math.sin(mine.bob * 0.5) * 0.25);
    ctx.strokeStyle = '#2a2f3a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * mine.r * 0.8, Math.sin(a) * mine.r * 0.8);
      ctx.lineTo(Math.cos(a) * mine.r * 1.38, Math.sin(a) * mine.r * 1.38);
      ctx.stroke();
      ctx.fillStyle = '#ffd7a0';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * mine.r * 1.4, Math.sin(a) * mine.r * 1.4, 3, 0, TAU);
      ctx.fill();
    }
    const body = ctx.createRadialGradient(-mine.r * 0.35, -mine.r * 0.35, 2, 0, 0, mine.r);
    body.addColorStop(0, '#6a7686');
    body.addColorStop(0.6, '#38414f');
    body.addColorStop(1, '#171b24');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, mine.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#0c0f15';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, mine.r * 0.62, 0.3, 2.4);
    ctx.stroke();

    const blink = armed ? Math.floor(t * 30) % 2 === 0 : Math.sin(t * 5) > 0.2;
    ctx.fillStyle = blink ? '#ff4a3a' : '#7a1e18';
    ctx.beginPath();
    ctx.arc(0, 0, mine.r * 0.26, 0, TAU);
    ctx.fill();
    if (blink) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, mine.r * 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
