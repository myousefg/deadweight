// Things that float on the water: pearls (score and tide charge) and the occasional life ring.
// The boat collects them by sailing over them; pearls are drawn toward it from a distance.

import { PALETTE, PEARL } from '../core/config.js';
import { TAU } from '../core/math.js';
import { audio } from '../audio/engine.js';

export function spawnPearl(world, x, y, value = 1) {
  const angle = world.rng.range(0, TAU);
  const speed = world.rng.range(60, 190);
  world.pickups.push({
    kind: 'pearl', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    value, age: 0, life: PEARL.life, r: 9,
  });
}

export function spawnLifeRing(world, x, y) {
  world.pickups.push({
    kind: 'ring', x, y, vx: 0, vy: 0, value: 1, age: 0, life: 12, r: 15,
  });
}

export function updatePickups(world, dt) {
  const { boat, build } = world;
  const list = world.pickups;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.age += dt;
    p.life -= dt;
    p.vx *= Math.exp(-3.2 * dt);
    p.vy *= Math.exp(-3.2 * dt);
    const dx = boat.x - p.x;
    const dy = boat.y - p.y;
    const gap = Math.hypot(dx, dy) || 1;
    // After a wave is cleared the whole sea's pearls are vacuumed to the boat.
    const magnet = world.vacuum ? 2000 : p.kind === 'pearl' ? PEARL.magnetRadius * build.magnet : 60;
    if (!boat.sinking && gap < magnet) {
      const pull = (1 - gap / magnet) * 900 + 120;
      p.vx += (dx / gap) * pull * dt;
      p.vy += (dy / gap) * pull * dt;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (!boat.sinking && gap < PEARL.collectRadius + p.r * 0.4) {
      if (p.kind === 'pearl') world.collectPearl(p);
      else if (boat.hp < boat.maxHp) world.healBoat(1, p.x, p.y);
      else {
        world.stats.pearls += 5;
        world.purse += 5;
        world.effects.popup('+5', p.x, p.y - 10, { color: PALETTE.gold, size: 20 });
        audio.play('pearl');
      }
      list.splice(i, 1);
      continue;
    }
    if (p.life <= 0) list.splice(i, 1);
  }
}

export function drawPickups(ctx, world) {
  for (const p of world.pickups) {
    if (p.kind === 'pearl' && p.life < 3 && Math.floor(p.age * 12) % 2) continue;
    const bob = Math.sin(p.age * 5) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.kind === 'pearl') {
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      glow.addColorStop(0, 'rgba(255, 220, 240, 0.4)');
      glow.addColorStop(1, 'rgba(255, 245, 220, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, TAU);
      ctx.fill();
      const body = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.5, '#fff3df');
      body.addColorStop(1, '#e4b8d8');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.rotate(Math.sin(p.age * 2) * 0.2);
      drawLifeRing(ctx, 0, 0, 15, true);
    }
    ctx.restore();
  }
}

/** A red and white life ring, the game's heart icon. */
export function drawLifeRing(ctx, x, y, radius, full) {
  ctx.save();
  ctx.translate(x, y);
  const inner = radius * 0.5;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, (i / 4) * TAU, ((i + 1) / 4) * TAU);
    ctx.arc(0, 0, inner, ((i + 1) / 4) * TAU, (i / 4) * TAU, true);
    ctx.closePath();
    ctx.fillStyle = full ? (i % 2 ? '#ffffff' : PALETTE.red) : (i % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(232,55,74,0.2)');
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = full ? '#7a1424' : 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, inner, 0, TAU);
  ctx.stroke();
  ctx.restore();
}
