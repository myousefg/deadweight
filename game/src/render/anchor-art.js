// The chain and the anchor: a sagging linked chain from the boat, a speed-coloured motion trail,
// a glow that tells you how hard the next blow will land, and the equipped anchor itself.

import { HIT_TIERS } from '../core/config.js';
import { TAU } from '../core/math.js';
import { drawAnchorShape } from './anchor-shapes.js';

function chainPath(ctx, boat, anchor) {
  const dx = anchor.x - boat.x;
  const dy = anchor.y - boat.y;
  const length = Math.hypot(dx, dy) || 1;
  const midX = (boat.x + anchor.x) / 2;
  const midY = (boat.y + anchor.y) / 2;
  const bulge = anchor.sag * 2;
  ctx.beginPath();
  ctx.moveTo(boat.x, boat.y);
  ctx.quadraticCurveTo(midX + (-dy / length) * bulge, midY + (dx / length) * bulge, anchor.x, anchor.y);
}

function drawChain(ctx, boat, anchor) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.translate(4, 9);
  ctx.strokeStyle = 'rgba(2, 22, 32, 0.28)';
  ctx.lineWidth = 7;
  chainPath(ctx, boat, anchor);
  ctx.stroke();
  ctx.translate(-4, -9);

  ctx.strokeStyle = '#26343c';
  ctx.lineWidth = 7.5;
  chainPath(ctx, boat, anchor);
  ctx.stroke();
  ctx.strokeStyle = '#d6e3ea';
  ctx.lineWidth = 4.4;
  ctx.setLineDash([8, 6]);
  chainPath(ctx, boat, anchor);
  ctx.stroke();
  ctx.strokeStyle = '#7b92a1';
  ctx.lineDashOffset = -7;
  ctx.lineWidth = 3.2;
  chainPath(ctx, boat, anchor);
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx, anchor) {
  const trail = anchor.trail;
  if (trail.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < trail.length; i += 1) {
    const point = trail[i];
    const previous = trail[i - 1];
    const fraction = i / trail.length;
    if (point.tier === 0) continue;
    ctx.globalAlpha = fraction * 0.75;
    ctx.strokeStyle = HIT_TIERS[point.tier - 1].color;
    ctx.lineWidth = 3 + fraction * anchor.r * (0.8 + point.tier * 0.35);
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAnchorBody(ctx, anchor, kind, time) {
  const scale = (anchor.r / 17) * 1.2;
  ctx.save();
  ctx.translate(anchor.x, anchor.y);

  if (kind === 'lantern') {
    const lamp = ctx.createRadialGradient(0, 0, 4, 0, 0, anchor.r * 4.5);
    lamp.addColorStop(0, 'rgba(255, 200, 90, 0.5)');
    lamp.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(0, 0, anchor.r * 4.5, 0, TAU);
    ctx.fill();
  }

  if (anchor.tier > 0) {
    const color = HIT_TIERS[anchor.tier - 1].color;
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, anchor.r * 3);
    glow.addColorStop(0, `${color}cc`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, anchor.r * 3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 20);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, anchor.r + 5, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(2, 22, 32, 0.3)';
  ctx.beginPath();
  ctx.ellipse(5, 10, anchor.r * 1.1, anchor.r * 0.75, 0, 0, TAU);
  ctx.fill();

  ctx.rotate(anchor.angle);
  ctx.scale(scale, scale);
  drawAnchorShape(ctx, kind, time);
  ctx.restore();
}

export function drawChainAndAnchor(ctx, world) {
  const { boat, anchor } = world;
  if (boat.sinking && boat.sinkTime > 1.8) return;
  drawChain(ctx, boat, anchor);
  drawTrail(ctx, anchor);
  drawAnchorBody(ctx, anchor, world.anchorKind, world.time);
}
