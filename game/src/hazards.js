// Ground hazards: the Kraken's tentacle slams. Each one shows a red warning circle, a tentacle
// reaches out from its owner, and when the timer runs out it strikes everything inside.

import { PALETTE } from './config.js';
import { TAU, easeOutCubic } from './math.js';
import { audio } from './audio.js';

const RETRACT = 0.7;

export function addSlam(world, owner, x, y, radius, delay, damage = 1) {
  world.hazards.push({
    kind: 'slam', owner, x, y, r: radius, delay, damage,
    t: 0, struck: false, side: world.rng.sign(),
  });
}

export function updateHazards(world, dt) {
  const list = world.hazards;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const h = list[i];
    h.t += dt;
    if (!h.struck && h.t >= h.delay) {
      h.struck = true;
      strike(world, h);
    }
    if (h.t >= h.delay + RETRACT) list.splice(i, 1);
  }
}

function strike(world, hazard) {
  const { boat } = world;
  audio.play('tentacle');
  world.effects.addShake(14);
  world.effects.stop(0.06);
  world.particles.splash(hazard.x, hazard.y, 26, PALETTE.foam, 380);
  world.particles.ring(hazard.x, hazard.y, hazard.r * 0.3, hazard.r * 1.5, 0.5, PALETTE.foam, 6);
  world.particles.ring(hazard.x, hazard.y, hazard.r * 0.2, hazard.r * 1.1, 0.35, PALETTE.violet, 4);
  const gap = Math.hypot(boat.x - hazard.x, boat.y - hazard.y);
  if (gap < hazard.r + boat.r * 0.6) world.hurtBoat(hazard.damage, hazard.x, hazard.y);
}

/** Warning circles sit under everything else. */
export function drawHazardTelegraphs(ctx, world) {
  for (const h of world.hazards) {
    if (h.struck) continue;
    const progress = Math.min(1, h.t / h.delay);
    const pulse = 0.5 + 0.5 * Math.sin(h.t * 18);
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.22 * progress + 0.1 * pulse * progress;
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = progress > 0.7 ? '#ffffff' : PALETTE.red;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]);
    ctx.lineDashOffset = -h.t * 60;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r * progress, 0, TAU);
    ctx.globalAlpha = 0.28;
    ctx.fill();
    ctx.restore();
  }
}

/** The tentacle itself, drawn above the creatures. */
export function drawHazardTentacles(ctx, world) {
  for (const h of world.hazards) {
    const owner = h.owner;
    if (!owner || owner.dead) continue;
    const reach = h.struck
      ? 1 - Math.max(0, (h.t - h.delay) / RETRACT)
      : easeOutCubic(Math.min(1, h.t / (h.delay * 0.8)));
    if (reach <= 0.02) continue;
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
}
