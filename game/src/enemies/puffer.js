// Pufferfish: the sniper. It keeps its distance, swells up with a warning, then fires a fan of
// spines. Bat the spines back with a fast anchor to turn its own weapon on the school.

import { PALETTE } from '../config.js';
import { TAU, turnToward, easeOutCubic } from '../math.js';
import { audio } from '../audio.js';
import { spawnProjectile } from '../projectiles.js';

const INFLATE = 0.75;
const DEFLATE = 0.5;
const FAN = 5;

export const puffer = {
  id: 'puffer',
  name: 'Pufferfish',
  radius: 21,
  hp: 4,
  mass: 1.4,
  contact: 1,
  score: 300,
  pearls: [2, 3],

  init(e, world) {
    e.state = 'idle';
    e.timer = world.rng.range(1.4, 3);
    e.baseR = e.r;
    e.strafe = world.rng.sign();
  },

  update(e, world, dt) {
    const boat = world.boat;
    const dx = boat.x - e.x;
    const dy = boat.y - e.y;
    const gap = Math.hypot(dx, dy) || 1;
    const toBoat = Math.atan2(dy, dx);
    e.heading = turnToward(e.heading, toBoat, 3 * dt);
    e.timer -= dt;

    if (e.state === 'idle') {
      let speed = 0;
      if (world.hunt) speed = gap > 170 ? 130 : 0;
      else if (gap < 250) speed = -95;
      else if (gap > 360) speed = 80;
      const perpendicular = e.strafe * 38;
      e.vx = (dx / gap) * speed * world.speedScale + (-dy / gap) * perpendicular;
      e.vy = (dy / gap) * speed * world.speedScale + (dx / gap) * perpendicular;
      e.r = e.baseR;
      if (e.timer <= 0) {
        e.state = 'inflate';
        e.timer = INFLATE;
        audio.play('warn');
      }
    } else if (e.state === 'inflate') {
      e.vx *= 0.9;
      e.vy *= 0.9;
      const progress = 1 - Math.max(0, e.timer) / INFLATE;
      e.r = e.baseR * (1 + 0.55 * easeOutCubic(progress));
      if (e.timer <= 0) {
        e.state = 'deflate';
        e.timer = DEFLATE;
        audio.play('spit');
        for (let i = 0; i < FAN; i += 1) {
          const angle = toBoat + (i - (FAN - 1) / 2) * 0.28;
          spawnProjectile(world, {
            x: e.x + Math.cos(angle) * e.r,
            y: e.y + Math.sin(angle) * e.r,
            vx: Math.cos(angle) * 300,
            vy: Math.sin(angle) * 300,
            r: 7,
            damage: 1,
            kind: 'spine',
            life: 3.2,
          });
        }
        world.particles.ring(e.x, e.y, e.r, e.r * 2, 0.3, PALETTE.gold, 3);
      }
    } else {
      e.vx *= 0.9;
      e.vy *= 0.9;
      const progress = Math.max(0, e.timer) / DEFLATE;
      e.r = e.baseR * (1 + 0.55 * progress);
      if (e.timer <= 0) {
        e.state = 'idle';
        e.timer = world.rng.range(2.2, 3.6);
        e.r = e.baseR;
      }
    }
  },

  draw(ctx, e) {
    const swell = e.r / e.baseR;
    const spikes = swell > 1.05 ? Math.min(1, (swell - 1) / 0.4) : 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.heading);

    ctx.fillStyle = '#ff9d3d';
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.8, 0);
    ctx.lineTo(-e.r * 1.45, -e.r * 0.45 + Math.sin(e.age * 9) * 3);
    ctx.lineTo(-e.r * 1.45, e.r * 0.45 + Math.sin(e.age * 9) * 3);
    ctx.closePath();
    ctx.fill();

    if (spikes > 0) {
      ctx.strokeStyle = '#fff0b8';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.r * 0.9, Math.sin(a) * e.r * 0.9);
        ctx.lineTo(Math.cos(a) * e.r * (0.9 + 0.5 * spikes), Math.sin(a) * e.r * (0.9 + 0.5 * spikes));
        ctx.stroke();
      }
    }

    const body = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.3, 2, 0, 0, e.r);
    body.addColorStop(0, '#fff3b0');
    body.addColorStop(0.7, '#ffd25a');
    body.addColorStop(1, '#e89a2a');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();

    ctx.fillStyle = 'rgba(232, 120, 40, 0.8)';
    [[-0.3, -0.2], [-0.1, 0.4], [-0.5, 0.2], [0.1, -0.5]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x * e.r, y * e.r, e.r * 0.12, 0, TAU);
      ctx.fill();
    });

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e.r * 0.45, -e.r * 0.38, e.r * 0.22, 0, TAU);
    ctx.arc(e.r * 0.45, e.r * 0.38, e.r * 0.22, 0, TAU);
    ctx.fill();
    ctx.fillStyle = e.state === 'inflate' ? PALETTE.red : '#1a1033';
    ctx.beginPath();
    ctx.arc(e.r * 0.52, -e.r * 0.38, e.r * 0.1, 0, TAU);
    ctx.arc(e.r * 0.52, e.r * 0.38, e.r * 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c8501f';
    ctx.beginPath();
    ctx.ellipse(e.r * 0.85, 0, e.r * 0.13, e.r * 0.1 + spikes * e.r * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
};
