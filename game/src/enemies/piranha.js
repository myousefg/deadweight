// Snapper: a small, fast fish that arrives in schools. It circles the boat at a distance, flashes
// a warning, then darts straight through. Sidestep the dart and swat the fish as it passes.

import { PALETTE } from '../config.js';
import { TAU, turnToward } from '../math.js';
import { audio } from '../audio.js';

const WINDUP = 0.5;
const DASH = 0.7;
const RECOVER = 0.45;

export const piranha = {
  id: 'piranha',
  name: 'Snapper',
  radius: 13,
  hp: 1,
  mass: 0.6,
  contact: 1,
  score: 60,
  pearls: [0, 1],

  init(e, world) {
    e.state = 'orbit';
    e.timer = world.rng.range(1.2, 3.4);
    e.orbitAngle = world.rng.range(0, TAU);
    e.orbitDir = world.rng.sign();
    e.ring = world.rng.range(190, 280);
  },

  update(e, world, dt) {
    const boat = world.boat;
    const scale = world.speedScale;
    e.timer -= dt;
    if (e.state === 'orbit') {
      e.orbitAngle += e.orbitDir * 0.8 * dt;
      const tx = boat.x + Math.cos(e.orbitAngle) * e.ring;
      const ty = boat.y + Math.sin(e.orbitAngle) * e.ring;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const gap = Math.hypot(dx, dy) || 1;
      const speed = Math.min(230 * scale, gap * 3.2);
      e.vx = (dx / gap) * speed;
      e.vy = (dy / gap) * speed;
      if (speed > 20) e.heading = turnToward(e.heading, Math.atan2(e.vy, e.vx), 8 * dt);
      if (e.timer <= 0) {
        e.state = 'windup';
        e.timer = WINDUP;
        audio.play('warn');
      }
    } else if (e.state === 'windup') {
      e.vx *= 0.9;
      e.vy *= 0.9;
      e.heading = turnToward(e.heading, Math.atan2(boat.y - e.y, boat.x - e.x), 12 * dt);
      if (e.timer <= 0) {
        e.state = 'dash';
        e.timer = DASH;
        e.dashX = Math.cos(e.heading);
        e.dashY = Math.sin(e.heading);
      }
    } else if (e.state === 'dash') {
      e.vx = e.dashX * 560 * scale;
      e.vy = e.dashY * 560 * scale;
      world.particles.foam(e.x, e.y, 5, 0.4);
      if (e.timer <= 0) {
        e.state = 'recover';
        e.timer = RECOVER;
      }
    } else {
      e.vx *= 0.88;
      e.vy *= 0.88;
      if (e.timer <= 0) {
        e.state = 'orbit';
        e.timer = world.rng.range(1.8, 3.6);
      }
    }
  },

  draw(ctx, e) {
    const wag = Math.sin(e.age * (e.state === 'dash' ? 38 : 16) + e.phase) * 0.35;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.heading);
    ctx.scale(1.35, 1.35);

    if (e.state === 'windup') {
      ctx.strokeStyle = Math.floor(e.age * 20) % 2 ? PALETTE.gold : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, TAU);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(-12, 0);
    ctx.rotate(wag);
    ctx.fillStyle = '#c8322b';
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const body = ctx.createLinearGradient(0, -9, 0, 9);
    body.addColorStop(0, '#ff7a45');
    body.addColorStop(0.6, '#e8483a');
    body.addColorStop(1, '#ffc27a');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#a82622';
    ctx.beginPath();
    ctx.moveTo(-3, -7);
    ctx.lineTo(3, -12);
    ctx.lineTo(5, -6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(9 + i * 1.5, -3 + i * 3);
      ctx.lineTo(13, -2 + i * 2.6);
      ctx.lineTo(10 + i * 1.5, -1 + i * 3);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(7, -3.5, 2.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a1033';
    ctx.beginPath();
    ctx.arc(7.6, -3.5, 1.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
};
