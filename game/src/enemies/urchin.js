// Spiny urchin: slow, heavy and mean. Hit it hard and it bursts into a ring of flying spines,
// so the best blow is the one you land with room to dodge what comes out.

import { PALETTE } from '../config.js';
import { TAU, turnToward } from '../math.js';
import { spawnProjectile } from '../projectiles.js';

const SPINES = 8;

export const urchin = {
  id: 'urchin',
  name: 'Spiny Urchin',
  radius: 24,
  hp: 4,
  mass: 3,
  contact: 1,
  score: 250,
  pearls: [2, 3],

  update(e, world, dt) {
    const boat = world.boat;
    const toBoat = Math.atan2(boat.y - e.y, boat.x - e.x);
    e.heading = turnToward(e.heading, toBoat, 0.9 * dt);
    const speed = 44 * world.speedScale;
    e.vx = Math.cos(e.heading) * speed;
    e.vy = Math.sin(e.heading) * speed;
  },

  onDeath(e, world) {
    const offset = world.rng.range(0, TAU);
    for (let i = 0; i < SPINES; i += 1) {
      const angle = offset + (i / SPINES) * TAU;
      spawnProjectile(world, {
        x: e.x + Math.cos(angle) * e.r * 0.6,
        y: e.y + Math.sin(angle) * e.r * 0.6,
        vx: Math.cos(angle) * 250,
        vy: Math.sin(angle) * 250,
        r: 7,
        damage: 1,
        kind: 'spine',
        life: 1.8,
      });
    }
    world.particles.ring(e.x, e.y, e.r * 0.5, e.r * 2.6, 0.4, PALETTE.violet, 4);
  },

  draw(ctx, e) {
    const r = e.r;
    const spin = e.age * 0.6 + e.phase;
    const count = 16;
    ctx.save();
    ctx.translate(e.x, e.y);
    for (let i = 0; i < count; i += 1) {
      const a = spin + (i / count) * TAU;
      const length = r * (1.12 + 0.12 * Math.sin(e.age * 3 + i));
      const half = 0.1;
      ctx.fillStyle = i % 2 ? '#6b3fa0' : '#8f5bd0';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - half) * r * 0.55, Math.sin(a - half) * r * 0.55);
      ctx.lineTo(Math.cos(a) * length, Math.sin(a) * length);
      ctx.lineTo(Math.cos(a + half) * r * 0.55, Math.sin(a + half) * r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.coral;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * length, Math.sin(a) * length, 2.2, 0, TAU);
      ctx.fill();
    }
    const body = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r * 0.75);
    body.addColorStop(0, '#7b49b8');
    body.addColorStop(1, '#2d1850');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    ctx.rotate(e.heading);
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.ellipse(r * 0.28, -r * 0.2, 4.5, 3, 0.4, 0, TAU);
    ctx.ellipse(r * 0.28, r * 0.2, 4.5, 3, -0.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
};
