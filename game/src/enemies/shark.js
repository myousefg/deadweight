// Reef shark: circles at a distance, locks on with a red warning line, then charges straight
// through the boat's position. After the charge it is dazed and takes extra damage, so the
// opening is right after you dodge.

import { PALETTE } from '../config.js';
import { TAU, turnToward } from '../math.js';
import { audio } from '../audio.js';

const AIM = 0.85;
const CHARGE = 0.9;
const STUN = 1.3;

export const shark = {
  id: 'shark',
  name: 'Reef Shark',
  radius: 31,
  hp: 10,
  mass: 4,
  contact: 2,
  score: 700,
  pearls: [3, 5],

  init(e, world) {
    e.state = 'circle';
    e.timer = world.rng.range(2, 3.2);
    e.orbitAngle = world.rng.range(0, TAU);
    e.orbitDir = world.rng.sign();
  },

  update(e, world, dt) {
    const boat = world.boat;
    const scale = world.speedScale;
    e.timer -= dt;
    e.stun = Math.max(0, e.stun - dt);

    if (e.state === 'circle') {
      e.orbitAngle += e.orbitDir * 0.55 * dt;
      const tx = boat.x + Math.cos(e.orbitAngle) * 290;
      const ty = boat.y + Math.sin(e.orbitAngle) * 290;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const gap = Math.hypot(dx, dy) || 1;
      const speed = Math.min(170 * scale, gap * 2.4);
      e.vx = (dx / gap) * speed;
      e.vy = (dy / gap) * speed;
      if (speed > 15) e.heading = turnToward(e.heading, Math.atan2(e.vy, e.vx), 3 * dt);
      if (e.timer <= 0) {
        e.state = 'aim';
        e.timer = AIM;
        audio.play('warn');
      }
    } else if (e.state === 'aim') {
      e.vx *= 0.85;
      e.vy *= 0.85;
      e.heading = turnToward(e.heading, Math.atan2(boat.y - e.y, boat.x - e.x), 6 * dt);
      if (e.timer <= 0) {
        e.state = 'charge';
        e.timer = CHARGE;
        e.chargeX = Math.cos(e.heading);
        e.chargeY = Math.sin(e.heading);
        world.effects.addShake(5);
      }
    } else if (e.state === 'charge') {
      e.vx = e.chargeX * 660 * scale;
      e.vy = e.chargeY * 660 * scale;
      if (Math.random() < 0.7) world.particles.foam(e.x - e.chargeX * 40, e.y - e.chargeY * 40, 12, 0.7);
      const outside = e.x < -20 || e.x > 1300 || e.y < -20 || e.y > 740;
      if (e.timer <= 0 || outside) {
        e.state = 'stun';
        e.timer = STUN;
        e.stun = STUN;
      }
    } else {
      e.vx *= 0.9;
      e.vy *= 0.9;
      if (e.timer <= 0) {
        e.state = 'circle';
        e.timer = world.rng.range(2, 3.2);
        e.orbitAngle = Math.atan2(e.y - boat.y, e.x - boat.x);
      }
    }
  },

  draw(ctx, e) {
    const sway = Math.sin(e.age * (e.state === 'charge' ? 20 : 7) + e.phase) * 0.18;
    if (e.state === 'aim') {
      ctx.save();
      ctx.strokeStyle = Math.floor(e.age * 14) % 2 ? PALETTE.red : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.heading) * 620, e.y + Math.sin(e.heading) * 620);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.heading);

    ctx.save();
    ctx.translate(-46, 0);
    ctx.rotate(sway);
    ctx.fillStyle = '#4a6a82';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.quadraticCurveTo(-8, -4, -30, -24);
    ctx.quadraticCurveTo(-18, -2, -22, 0);
    ctx.quadraticCurveTo(-18, 2, -30, 22);
    ctx.quadraticCurveTo(-8, 4, 10, 0);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#3d5a70';
    ctx.beginPath();
    ctx.moveTo(8, -12);
    ctx.lineTo(-10, -42);
    ctx.lineTo(-18, -10);
    ctx.closePath();
    ctx.moveTo(8, 12);
    ctx.lineTo(-10, 42);
    ctx.lineTo(-18, 10);
    ctx.closePath();
    ctx.fill();

    const body = ctx.createLinearGradient(0, -22, 0, 22);
    body.addColorStop(0, '#6f8ea6');
    body.addColorStop(0.5, '#8fb0c4');
    body.addColorStop(1, '#6f8ea6');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(58, 0);
    ctx.bezierCurveTo(46, -22, 8, -25, -22, -12);
    ctx.lineTo(-48, -3);
    ctx.lineTo(-48, 3);
    ctx.lineTo(-22, 12);
    ctx.bezierCurveTo(8, 25, 46, 22, 58, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.stroke();

    ctx.fillStyle = '#2f4a5e';
    ctx.beginPath();
    ctx.moveTo(24, -2);
    ctx.lineTo(-30, -2);
    ctx.lineTo(-30, 2);
    ctx.lineTo(24, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#10222d';
    ctx.beginPath();
    ctx.arc(38, -9, 3.2, 0, TAU);
    ctx.arc(38, 9, 3.2, 0, TAU);
    ctx.fill();
    if (e.state === 'aim') {
      ctx.fillStyle = PALETTE.red;
      ctx.beginPath();
      ctx.arc(38, -9, 2.2, 0, TAU);
      ctx.arc(38, 9, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    if (e.stun > 0) {
      ctx.save();
      ctx.translate(e.x, e.y);
      for (let i = 0; i < 3; i += 1) {
        const a = e.age * 5 + (i / 3) * TAU;
        const sx = Math.cos(a) * 26;
        const sy = Math.sin(a) * 10 - 34;
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        for (let k = 0; k < 10; k += 1) {
          const rr = k % 2 ? 3 : 7;
          const aa = (k / 10) * TAU - Math.PI / 2;
          const px = sx + Math.cos(aa) * rr;
          const py = sy + Math.sin(aa) * rr;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  },
};
