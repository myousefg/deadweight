// Spines and ink blobs. Hostile ones hurt the boat; swat one with a fast anchor and it turns
// friendly and flies back at the fleet (combat.js decides that).

import { PALETTE, W, H } from './config.js';
import { TAU } from './math.js';

export function spawnProjectile(world, options) {
  world.projectiles.push({
    x: options.x,
    y: options.y,
    vx: options.vx,
    vy: options.vy,
    r: options.r ?? 8,
    damage: options.damage ?? 1,
    kind: options.kind ?? 'spine',
    life: options.life ?? 3,
    friendly: !!options.friendly,
    age: 0,
    dead: false,
  });
}

export function updateProjectiles(world, dt) {
  const list = world.projectiles;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.age += dt;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const outside = p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80;
    if (p.life <= 0 || outside || p.dead) list.splice(i, 1);
  }
}

export function drawProjectiles(ctx, world) {
  for (const p of world.projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.kind === 'ink') {
      const wobble = 1 + 0.12 * Math.sin(p.age * 18);
      ctx.fillStyle = p.friendly ? PALETTE.mint : '#2b1650';
      ctx.beginPath();
      ctx.arc(0, 0, p.r * wobble, 0, TAU);
      ctx.fill();
      ctx.fillStyle = p.friendly ? '#ffffff' : '#7a45c8';
      ctx.beginPath();
      ctx.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.32, 0, TAU);
      ctx.fill();
    } else {
      ctx.rotate(Math.atan2(p.vy, p.vx));
      const body = p.friendly ? PALETTE.mint : '#fff0b8';
      const tip = p.friendly ? '#ffffff' : PALETTE.coral;
      ctx.fillStyle = 'rgba(2, 22, 32, 0.3)';
      ctx.beginPath();
      ctx.ellipse(3, 7, p.r * 1.6, p.r * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(p.r * 1.7, 0);
      ctx.lineTo(-p.r * 1.2, -p.r * 0.55);
      ctx.lineTo(-p.r * 0.7, 0);
      ctx.lineTo(-p.r * 1.2, p.r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = tip;
      ctx.beginPath();
      ctx.moveTo(p.r * 1.7, 0);
      ctx.lineTo(p.r * 0.6, -p.r * 0.32);
      ctx.lineTo(p.r * 0.6, p.r * 0.32);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
