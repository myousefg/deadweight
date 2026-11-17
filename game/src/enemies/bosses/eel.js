// Storm Eel Queen: the Kelp Maze boss, a long electric serpent. Every circle of her body hurts and
// can be hit. She coils around the arena calling down lightning, then dives off screen and
// sweeps the whole width or height of the sea in one deadly pass (a red band shows where).

import { W, H, PALETTE } from '../../core/config.js';
import { TAU, clamp } from '../../core/math.js';
import { audio } from '../../audio/engine.js';
import { addSlam } from '../../sim/hazards.js';

const SEGMENTS = 15;
const SPACING = 34;
const CENTER_X = W / 2;
const CENTER_Y = H * 0.54;
const RADIUS_X = 430;
const RADIUS_Y = 200;
const COIL_TIME = 6.5;
const TELEGRAPH = 1.1;

const phaseOf = (e) => (e.hp / e.maxHp > 0.5 ? 1 : 2);
const segmentRadius = (index) => 26 - (index / SEGMENTS) * 14;

/** Rebuild the body circles by walking back along the head's recent path. */
function placeParts(e) {
  const trail = e.trail;
  const parts = [{ x: e.x, y: e.y, r: e.r }];
  let travelled = 0;
  let target = SPACING;
  for (let i = 1; i < trail.length && parts.length <= SEGMENTS; i += 1) {
    const a = trail[i - 1];
    const b = trail[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    while (travelled + length >= target && parts.length <= SEGMENTS) {
      const u = (target - travelled) / (length || 1);
      parts.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, r: segmentRadius(parts.length) });
      target += SPACING;
    }
    travelled += length;
    if (travelled > SEGMENTS * SPACING + 120) {
      trail.length = i + 1;
      break;
    }
  }
  const last = trail[trail.length - 1] || { x: e.x, y: e.y };
  while (parts.length <= SEGMENTS) parts.push({ x: last.x, y: last.y, r: segmentRadius(parts.length) });
  e.parts = parts;
}

function pushTrail(e) {
  const trail = e.trail;
  const head = trail[0];
  if (!head || Math.hypot(e.x - head.x, e.y - head.y) >= 6) trail.unshift({ x: e.x, y: e.y });
}

function resetTrail(e, x, y) {
  e.x = x;
  e.y = y;
  e.trail = [{ x, y }];
}

function lightning(e, world) {
  const { boat } = world;
  const count = phaseOf(e) === 1 ? 3 : 5;
  audio.play('warn');
  for (let i = 0; i < count; i += 1) {
    const aimed = i === 0;
    const x = clamp(aimed ? boat.x + boat.vx * 0.4 : boat.x + world.rng.range(-280, 280), 80, W - 80);
    const y = clamp(aimed ? boat.y + boat.vy * 0.4 : boat.y + world.rng.range(-220, 220), 170, H - 60);
    addSlam(world, null, x, y, 62, 1.0 + i * 0.12, 1, 'bolt');
  }
}

/** Pick a sweep: head start, direction and the band the warning shows. */
function chooseSweep(e, world) {
  const horizontal = world.rng.chance(0.55);
  if (horizontal) {
    const y = world.rng.range(170, H - 110);
    const fromLeft = world.rng.chance(0.5);
    e.sweep = { sx: fromLeft ? -220 : W + 220, sy: y, dx: fromLeft ? 1 : -1, dy: 0, horizontal: true, y };
  } else {
    const x = world.rng.range(120, W - 120);
    const fromTop = world.rng.chance(0.5);
    e.sweep = { sx: x, sy: fromTop ? -220 : H + 220, dx: 0, dy: fromTop ? 1 : -1, horizontal: false, x };
  }
}

export const eel = {
  id: 'eel',
  name: 'Storm Eel Queen',
  boss: true,
  notches: [0.5],
  radius: 28,
  hp: 90,
  mass: 90,
  contact: 1,
  score: 3500,
  pearls: [0, 0],

  init(e, world) {
    e.hp = world.bossHp(90);
    e.maxHp = e.hp;
    resetTrail(e, -140, 210);
    e.state = 'enter';
    e.timer = 0;
    e.theta = 0;
    e.invulnerable = true;
    e.strikeCd = 2.2;
    e.sweeps = 0;
    placeParts(e);
    audio.play('roar');
    world.effects.addShake(8);
  },

  update(e, world, dt) {
    pushTrail(e);
    placeParts(e);
    const phase = phaseOf(e);
    e.timer += dt;

    if (e.state === 'enter') {
      e.vx = 420;
      e.vy = 0;
      if (e.x > 760) {
        e.state = 'coil';
        e.timer = 0;
        e.invulnerable = false;
        e.theta = Math.atan2((e.y - CENTER_Y) / RADIUS_Y, (e.x - CENTER_X) / RADIUS_X);
      }
    } else if (e.state === 'coil') {
      const omega = phase === 1 ? 0.95 : 1.4;
      e.theta += omega * dt;
      const tx = CENTER_X + Math.cos(e.theta) * RADIUS_X;
      const ty = CENTER_Y + Math.sin(e.theta) * RADIUS_Y;
      e.vx = (tx - e.x) * 7;
      e.vy = (ty - e.y) * 7;
      e.strikeCd -= dt;
      if (e.strikeCd <= 0) {
        lightning(e, world);
        e.strikeCd = phase === 1 ? 2.8 : 2.0;
      }
      if (e.timer > COIL_TIME && Math.abs(Math.sin(e.theta)) < 0.15) {
        e.state = 'dive';
        e.diveX = Math.cos(e.theta) > 0 ? 1 : -1;
        e.timer = 0;
      }
    } else if (e.state === 'dive') {
      e.vx = e.diveX * 780;
      e.vy = 0;
      if (e.x < -720 || e.x > W + 720) {
        chooseSweep(e, world);
        e.state = 'telegraph';
        e.timer = 0;
        e.vx = 0;
        e.vy = 0;
        audio.play('roar');
      }
    } else if (e.state === 'telegraph') {
      e.vx = 0;
      e.vy = 0;
      if (Math.floor(e.timer * 8) !== Math.floor((e.timer - dt) * 8)) audio.play('warn');
      if (e.timer >= TELEGRAPH) {
        resetTrail(e, e.sweep.sx, e.sweep.sy);
        e.state = 'sweep';
        e.timer = 0;
        audio.play('bolt');
        world.effects.addShake(8);
      }
    } else if (e.state === 'sweep') {
      e.vx = e.sweep.dx * 800;
      e.vy = e.sweep.dy * 800;
      const outside = e.x < -900 || e.x > W + 900 || e.y < -900 || e.y > H + 900;
      if (outside || e.timer > 4) {
        e.sweeps += 1;
        if (phase === 2 && e.sweeps % 2 === 1) {
          chooseSweep(e, world);
          e.state = 'telegraph';
        } else {
          resetTrail(e, -140, 210);
          e.state = 'enter';
          e.strikeCd = 1.4;
        }
        e.timer = 0;
      }
    }
    if (world.time % 0.12 < dt && Math.random() < 0.6) {
      const part = e.parts[Math.floor(Math.random() * e.parts.length)];
      world.particles.sparks(part.x, part.y, Math.random() * TAU, TAU, 2, '#bfe6ff', 160);
    }
  },

  onDeath(e, world) {
    world.bossDown(e.x, e.y);
  },

  draw(ctx, e) {
    if (e.state === 'telegraph' && e.sweep) {
      const sweep = e.sweep;
      const progress = Math.min(1, e.timer / TELEGRAPH);
      ctx.save();
      ctx.fillStyle = `rgba(232, 55, 74, ${0.1 + 0.2 * progress})`;
      ctx.strokeStyle = Math.floor(e.timer * 10) % 2 ? PALETTE.red : '#ffffff';
      ctx.lineWidth = 4;
      ctx.setLineDash([22, 14]);
      if (sweep.horizontal) {
        ctx.fillRect(0, sweep.y - 34, W, 68);
        ctx.strokeRect(0, sweep.y - 34, W, 68);
      } else {
        ctx.fillRect(sweep.x - 34, 0, 68, H);
        ctx.strokeRect(sweep.x - 34, 0, 68, H);
      }
      ctx.restore();
    }

    const parts = e.parts;
    const phase = phaseOf(e);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = parts.length - 1; i >= 1; i -= 1) {
      const p = parts[i];
      const previous = parts[i + 1] || p;
      const angle = Math.atan2(parts[i - 1].y - p.y, parts[i - 1].x - p.x);
      if (phase === 2 && i % 3 === 0 && Math.random() < 0.5) {
        ctx.strokeStyle = 'rgba(191, 230, 255, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(previous.x + (Math.random() - 0.5) * 30, previous.y + (Math.random() - 0.5) * 30);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      const body = ctx.createRadialGradient(-p.r * 0.2, -p.r * 0.3, p.r * 0.1, 0, 0, p.r);
      body.addColorStop(0, '#6fc3ff');
      body.addColorStop(0.6, '#2f7fcf');
      body.addColorStop(1, '#17407f');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#cfeaff';
      ctx.beginPath();
      ctx.ellipse(0, p.r * 0.35, p.r * 0.55, p.r * 0.28, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.arc(0, -p.r * 0.45, p.r * 0.17, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#17407f';
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.4, -p.r * 0.9);
      ctx.lineTo(0, -p.r * 1.45);
      ctx.lineTo(p.r * 0.4, -p.r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const head = parts[0];
    const neck = parts[1];
    const heading = Math.atan2(head.y - neck.y, head.x - neck.x);
    ctx.translate(head.x, head.y);
    ctx.rotate(heading);
    const skull = ctx.createRadialGradient(-6, -8, 4, 0, 0, 40);
    skull.addColorStop(0, '#8fd4ff');
    skull.addColorStop(1, '#245fb0');
    ctx.fillStyle = skull;
    ctx.beginPath();
    ctx.ellipse(6, 0, 38, 26, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#102f66';
    ctx.stroke();
    ctx.fillStyle = '#102f66';
    ctx.beginPath();
    ctx.moveTo(30, -4);
    ctx.lineTo(48, 0);
    ctx.lineTo(30, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe14d';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(18, side * 13, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#10051f';
      ctx.beginPath();
      ctx.ellipse(20, side * 13, 2.5, 5.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffe14d';
    }
    ctx.fillStyle = '#cfeaff';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-12 - i * 10, -22);
      ctx.lineTo(-18 - i * 10, -40 + i * 4);
      ctx.lineTo(-6 - i * 10, -24);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if (e.invulnerable) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(e.age * 12);
      ctx.fillStyle = '#ffffff';
      for (const p of parts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.05, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  },
};
