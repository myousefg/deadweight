// Ground hazards. Slams (tentacle strikes and lightning bolts) show a warning circle, then strike
// everything inside when their timer runs out. Rings are shockwaves that sweep outward from a
// point; dash through one to dodge it.

import { PALETTE } from './config.js';
import { TAU, easeOutCubic } from './math.js';
import { audio } from './audio.js';

const RETRACT = 0.7;
const BOLT_SHOW = 0.3;
const STYLES = {
  tentacle: { warn: PALETTE.red },
  bolt: { warn: '#7cc4ff' },
};

/** A telegraphed strike. `style` is 'tentacle' (needs an owner to draw the arm) or 'bolt'. */
export function addSlam(world, owner, x, y, radius, delay, damage = 1, style = 'tentacle') {
  world.hazards.push({
    kind: 'slam', style, owner, x, y, r: radius, delay, damage,
    t: 0, struck: false, side: world.rng.sign(),
  });
}

/** A shockwave ring that grows from (x, y) at `speed` pixels a second until it reaches `maxRadius`. */
export function addRing(world, x, y, speed, maxRadius, damage = 1) {
  world.hazards.push({ kind: 'ring', x, y, r: 10, speed, maxR: maxRadius, thick: 26, damage, t: 0 });
}

export function updateHazards(world, dt) {
  const list = world.hazards;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const h = list[i];
    h.t += dt;
    if (h.kind === 'ring') {
      h.r += h.speed * dt;
      const { boat } = world;
      const gap = Math.abs(Math.hypot(boat.x - h.x, boat.y - h.y) - h.r);
      if (gap < h.thick / 2 + boat.r * 0.6) world.hurtBoat(h.damage, h.x, h.y);
      if (h.r > h.maxR) list.splice(i, 1);
      continue;
    }
    if (!h.struck && h.t >= h.delay) {
      h.struck = true;
      strike(world, h);
    }
    const lifetime = h.style === 'bolt' ? BOLT_SHOW : RETRACT;
    if (h.t >= h.delay + lifetime) list.splice(i, 1);
  }
}

function strike(world, hazard) {
  const { boat } = world;
  const bolt = hazard.style === 'bolt';
  audio.play(bolt ? 'bolt' : 'tentacle');
  world.effects.addShake(bolt ? 9 : 14);
  world.effects.stop(0.06);
  world.particles.splash(hazard.x, hazard.y, 26, bolt ? '#bfe6ff' : PALETTE.foam, 380);
  world.particles.ring(hazard.x, hazard.y, hazard.r * 0.3, hazard.r * 1.5, 0.5, bolt ? '#ffffff' : PALETTE.foam, 6);
  world.particles.ring(hazard.x, hazard.y, hazard.r * 0.2, hazard.r * 1.1, 0.35, bolt ? '#7cc4ff' : PALETTE.violet, 4);
  const gap = Math.hypot(boat.x - hazard.x, boat.y - hazard.y);
  if (gap < hazard.r + boat.r * 0.6) world.hurtBoat(hazard.damage, hazard.x, hazard.y);
}

/** Warning circles and shockwave rings sit under everything else. */
export function drawHazardTelegraphs(ctx, world) {
  for (const h of world.hazards) {
    if (h.kind === 'ring') {
      ctx.save();
      const fade = 1 - h.r / h.maxR;
      ctx.lineWidth = h.thick;
      ctx.strokeStyle = `rgba(255, 244, 214, ${0.35 + 0.4 * fade})`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(255, 200, 61, ${0.9 * fade + 0.1})`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (h.struck) continue;
    const warn = STYLES[h.style].warn;
    const progress = Math.min(1, h.t / h.delay);
    const pulse = 0.5 + 0.5 * Math.sin(h.t * 18);
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.22 * progress + 0.1 * pulse * progress;
    ctx.fillStyle = warn;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = progress > 0.7 ? '#ffffff' : warn;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]);
    ctx.lineDashOffset = -h.t * 60;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = warn;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r * progress, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/** The tentacle arms and lightning bolts themselves, drawn above the creatures. */
export function drawHazardTentacles(ctx, world) {
  for (const h of world.hazards) {
    if (h.kind !== 'slam') continue;
    if (h.style === 'bolt') drawBolt(ctx, h);
    else drawTentacle(ctx, h);
  }
}

function drawBolt(ctx, h) {
  if (!h.struck) return;
  const age = h.t - h.delay;
  const fade = 1 - age / BOLT_SHOW;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [width, color] of [[16, 'rgba(124, 196, 255, 0.55)'], [5, '#ffffff']]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(h.x + 30, -20);
    const steps = 9;
    for (let i = 1; i < steps; i += 1) {
      const u = i / steps;
      const jitter = Math.sin(h.x * 0.37 + i * 12.9898 + Math.floor(age * 40)) * 28;
      ctx.lineTo(h.x + (1 - u) * 30 + jitter * (1 - u * 0.4), -20 + (h.y + 20) * u);
    }
    ctx.lineTo(h.x, h.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTentacle(ctx, h) {
  const owner = h.owner;
  if (!owner || owner.dead) return;
  const reach = h.struck
    ? 1 - Math.max(0, (h.t - h.delay) / RETRACT)
    : easeOutCubic(Math.min(1, h.t / (h.delay * 0.8)));
  if (reach <= 0.02) return;
  const startX = owner.x;
  const startY = owner.y;
  const endX = startX + (h.x - startX) * reach;
  const endY = startY + (h.y - startY) * reach;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy) || 1;
  const bend = Math.sin(h.t * 5) * 30 + h.side * 36 * (1 - reach * 0.5);
  const cx = midX + (-dy / length) * bend;
  const cy = midY + (dx / length) * bend;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a1148';
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(cx, cy, endX, endY);
  ctx.stroke();
  ctx.strokeStyle = '#7a3fb8';
  ctx.lineWidth = 28;
  ctx.stroke();
  ctx.strokeStyle = '#b176f0';
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(startX + 4, startY - 4);
  ctx.quadraticCurveTo(cx + 4, cy - 4, endX, endY - 5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffd7ef';
  for (let i = 1; i <= 5; i += 1) {
    const u = i / 6;
    const px = (1 - u) * (1 - u) * startX + 2 * (1 - u) * u * cx + u * u * endX;
    const py = (1 - u) * (1 - u) * startY + 2 * (1 - u) * u * cy + u * u * endY;
    ctx.beginPath();
    ctx.arc(px, py, 3.4 * (0.5 + u * 0.5), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
