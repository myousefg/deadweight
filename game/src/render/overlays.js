// World-space effects drawn above the creatures: the tide surge ring, lightning arcs and the
// golden glow of the Kraken's last moments.

import { SURGE } from '../core/config.js';
import { TAU, easeOutCubic } from '../core/math.js';

export function drawSurgeRing(ctx, world) {
  const surge = world.surge;
  if (!surge) return;
  const { boat } = world;
  const progress = Math.min(1, surge.t / SURGE.time);
  const radius = SURGE.radius * easeOutCubic(progress);
  ctx.save();
  const fill = ctx.createRadialGradient(boat.x, boat.y, radius * 0.6, boat.x, boat.y, radius);
  fill.addColorStop(0, 'rgba(111, 242, 197, 0)');
  fill.addColorStop(1, `rgba(111, 242, 197, ${0.32 * (1 - progress)})`);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(boat.x, boat.y, radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = `rgba(234, 252, 247, ${0.95 * (1 - progress * 0.7)})`;
  ctx.lineWidth = 12 * (1 - progress * 0.6);
  ctx.beginPath();
  ctx.arc(boat.x, boat.y, radius, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = `rgba(111, 242, 197, ${0.8 * (1 - progress)})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(boat.x, boat.y, radius * 0.9, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function drawZaps(ctx, world) {
  for (const zap of world.zaps) {
    const fraction = zap.life / zap.max;
    ctx.save();
    ctx.globalAlpha = fraction;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [width, color] of [[7, 'rgba(120, 190, 255, 0.5)'], [2.5, '#ffffff']]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(zap.x1, zap.y1);
      const segments = 7;
      for (let i = 1; i < segments; i += 1) {
        const u = i / segments;
        const jitter = (Math.sin(zap.max * 900 + i * 12.9898 + zap.x2) * 43758.5453) % 1;
        ctx.lineTo(
          zap.x1 + (zap.x2 - zap.x1) * u + (jitter - 0.5) * 36,
          zap.y1 + (zap.y2 - zap.y1) * u + (Math.cos(jitter * 9) * 0.5) * 30,
        );
      }
      ctx.lineTo(zap.x2, zap.y2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawFinale(ctx, world) {
  const finale = world.finale;
  if (!finale || finale.t > 3) return;
  const fade = Math.max(0, 1 - finale.t / 3);
  ctx.save();
  const glow = ctx.createRadialGradient(finale.x, finale.y, 10, finale.x, finale.y, 420);
  glow.addColorStop(0, `rgba(255, 220, 120, ${0.65 * fade})`);
  glow.addColorStop(1, 'rgba(255, 220, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(finale.x, finale.y, 420, 0, TAU);
  ctx.fill();
  ctx.restore();
}
