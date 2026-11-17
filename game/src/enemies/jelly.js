// Moon jelly: the gentle opener. It pulses toward the boat in bursts, trailing glowing tentacles,
// and does nothing but bump. Easy to sink, so it teaches the swing.

import { TAU, turnToward } from '../math.js';

export const jelly = {
  id: 'jelly',
  name: 'Moon Jelly',
  radius: 23,
  hp: 2,
  mass: 1,
  contact: 1,
  score: 100,
  pearls: [1, 2],

  update(e, world, dt) {
    const boat = world.boat;
    const toBoat = Math.atan2(boat.y - e.y, boat.x - e.x);
    e.heading = turnToward(e.heading, toBoat, 1.5 * dt);
    const pulse = Math.max(0, Math.sin(e.age * 3.2 + e.phase));
    const speed = (22 + 125 * pulse * pulse) * world.speedScale;
    e.vx = Math.cos(e.heading) * speed;
    e.vy = Math.sin(e.heading) * speed;
  },

  draw(ctx, e) {
    const r = e.r;
    const t = e.age * 3.2 + e.phase;
    const squash = 0.9 + 0.1 * Math.sin(t);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.heading);
    ctx.lineCap = 'round';

    for (let i = 0; i < 6; i += 1) {
      const offset = (i - 2.5) / 2.5;
      const baseY = offset * r * 0.55;
      const sway = Math.sin(t * 1.3 + i * 1.1) * r * 0.45;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, baseY);
      ctx.bezierCurveTo(-r * 0.9, baseY + sway * 0.5, -r * 1.4, baseY - sway, -r * 1.9, baseY + sway * 0.6);
      ctx.strokeStyle = 'rgba(255, 150, 205, 0.7)';
      ctx.lineWidth = 3.4 - Math.abs(offset);
      ctx.stroke();
    }

    const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.7);
    glow.addColorStop(0, 'rgba(255, 143, 198, 0.35)');
    glow.addColorStop(1, 'rgba(255, 143, 198, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.7, 0, TAU);
    ctx.fill();

    const bell = ctx.createRadialGradient(-r * 0.25, -r * 0.2, r * 0.1, 0, 0, r * 1.1);
    bell.addColorStop(0, 'rgba(255, 232, 245, 0.97)');
    bell.addColorStop(0.55, 'rgba(255, 143, 198, 0.9)');
    bell.addColorStop(1, 'rgba(164, 92, 255, 0.85)');
    ctx.fillStyle = bell;
    ctx.beginPath();
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * TAU;
      const rr = r * (1 + 0.07 * Math.sin(a * 10 + t * 0.5));
      const x = Math.cos(a) * rr * (1.06 - 0.06 * squash);
      const y = Math.sin(a) * rr * squash;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.52, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.2, r * 0.11, -0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  },
};
