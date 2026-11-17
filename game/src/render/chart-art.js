// Drawing for the sea chart: the parchment, little region and boss icons, and the compact route
// strip the harbor shows so the player always knows where on the voyage they are.

import { PALETTE } from '../core/config.js';
import { TAU } from '../core/math.js';
import { createRng } from '../core/random.js';
import { text } from './ui.js';
import { REGIONS, REGION_COUNT } from '../data/regions.js';

export const REGION_COLORS = {
  shallows: { top: '#37b8bd', bottom: '#127184', accent: '#ffd66b' },
  kelp: { top: '#5fbf7c', bottom: '#1f6b57', accent: '#b9ff9a' },
  fleet: { top: '#4fa6a0', bottom: '#1b4a55', accent: '#9bffe0' },
  abyss: { top: '#3d57c9', bottom: '#0a1747', accent: '#8fe8ff' },
};

/** The little emblem of each region, drawn about the point (x, y). */
export function drawRegionIcon(ctx, id, x, y, size, color = '#ffffff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.09);
  if (id === 'shallows') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.34, Math.sin(a) * size * 0.34);
      ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
      ctx.stroke();
    }
  } else if (id === 'kelp') {
    for (const [dx, lean, height] of [[-0.2, -0.12, 0.8], [0, 0.1, 1], [0.2, -0.08, 0.7]]) {
      ctx.beginPath();
      ctx.moveTo(dx * size, size * 0.5);
      ctx.quadraticCurveTo((dx + lean * 2) * size, size * (0.5 - height * 0.5), (dx + lean) * size, size * (0.5 - height));
      ctx.stroke();
    }
  } else if (id === 'fleet') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.44, size * 0.14);
    ctx.lineTo(size * 0.44, size * 0.14);
    ctx.lineTo(size * 0.3, size * 0.38);
    ctx.lineTo(-size * 0.3, size * 0.38);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size * 0.14);
    ctx.lineTo(size * 0.04, -size * 0.46);
    ctx.moveTo(size * 0.04, -size * 0.4);
    ctx.lineTo(size * 0.36, -size * 0.04);
    ctx.lineTo(size * 0.04, -size * 0.04);
    ctx.stroke();
  } else {
    ctx.beginPath();
    for (let step = 0; step <= 60; step += 1) {
      const u = step / 60;
      const a = u * 5.2;
      const r = size * (0.04 + 0.42 * u);
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (step === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A small portrait of a region's boss. */
export function drawBossIcon(ctx, bossId, x, y, size, color = '#ffffff', shade = 'rgba(0,0,0,0.35)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.07;
  if (bossId === 'colossus') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(side * size * 0.2, (i - 1) * size * 0.16);
        ctx.lineTo(side * size * 0.48, (i - 1) * size * 0.22 + size * 0.04);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(side * size * 0.3, -size * 0.34, size * 0.14, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3, size * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(0, size * 0.06, size * 0.16, 0, TAU);
    ctx.fill();
  } else if (bossId === 'eel') {
    ctx.lineWidth = size * 0.16;
    ctx.beginPath();
    ctx.moveTo(-size * 0.46, size * 0.28);
    ctx.bezierCurveTo(-size * 0.2, -size * 0.3, size * 0.1, size * 0.5, size * 0.3, -size * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.36, -size * 0.18, size * 0.13, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(size * 0.4, -size * 0.2, size * 0.04, 0, TAU);
    ctx.fill();
  } else if (bossId === 'admiral') {
    ctx.beginPath();
    ctx.moveTo(size * 0.48, 0);
    ctx.bezierCurveTo(size * 0.26, -size * 0.2, size * 0.14, -size * 0.24, -size * 0.1, -size * 0.24);
    ctx.lineTo(-size * 0.38, -size * 0.2);
    ctx.lineTo(-size * 0.38, size * 0.2);
    ctx.lineTo(-size * 0.1, size * 0.24);
    ctx.bezierCurveTo(size * 0.14, size * 0.24, size * 0.26, size * 0.2, size * 0.48, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade;
    for (const mx of [0.22, -0.02, -0.26]) {
      ctx.fillRect(size * mx - size * 0.025, -size * 0.17, size * 0.05, size * 0.34);
    }
    ctx.beginPath();
    ctx.arc(size * 0.34, 0, size * 0.04, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, -size * 0.08, size * 0.24, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 6; i += 1) {
      const a = Math.PI * (0.12 + (0.76 * i) / 5);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.16, size * 0.04 + Math.sin(a) * size * 0.14);
      ctx.quadraticCurveTo(Math.cos(a) * size * 0.4, size * 0.3 + (i % 2 ? 0.1 : -0.02) * size, Math.cos(a) * size * 0.46 + (i % 2 ? 6 : -6), size * 0.46);
      ctx.stroke();
    }
    ctx.fillStyle = shade;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * size * 0.09, -size * 0.1, size * 0.05, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A weathered parchment sheet with a ruled border. */
export function drawParchment(ctx, width, height) {
  const rng = createRng(5);
  const paper = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.95);
  paper.addColorStop(0, '#f6e8c0');
  paper.addColorStop(0.7, '#e5cf9a');
  paper.addColorStop(1, '#b8935a');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 38; i += 1) {
    const x = rng.range(0, width);
    const y = rng.range(0, height);
    const r = rng.range(40, 140);
    const stain = ctx.createRadialGradient(x, y, 0, x, y, r);
    stain.addColorStop(0, `rgba(150, 100, 40, ${rng.range(0.03, 0.08)})`);
    stain.addColorStop(1, 'rgba(150, 100, 40, 0)');
    ctx.fillStyle = stain;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.strokeStyle = 'rgba(90, 58, 24, 0.7)';
  ctx.lineWidth = 5;
  ctx.strokeRect(24, 24, width - 48, height - 48);
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, width - 68, height - 68);
}

/** A compass rose, for the corner of the chart. */
export function drawCompass(ctx, x, y, radius, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 0.5) * 0.05);
  ctx.strokeStyle = 'rgba(90, 58, 24, 0.75)';
  ctx.fillStyle = 'rgba(90, 58, 24, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.6, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    ctx.save();
    ctx.rotate((i / 4) * TAU);
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.14, -radius * 0.14);
    ctx.lineTo(0, 0);
    ctx.lineTo(-radius * 0.14, -radius * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  text(ctx, 'N', 0, -radius - 8, { size: 18, align: 'center', color: 'rgba(90, 58, 24, 0.9)' });
  ctx.restore();
}

/**
 * The four regions as a row of nodes joined by a dashed route. Regions before `current` are
 * cleared (gold), `current` pulses, the rest are ahead. Used small, in the harbor's corner.
 */
export function drawRouteStrip(ctx, x, y, spacing, current, time) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = 'rgba(234, 252, 247, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + spacing * (REGION_COUNT - 1), y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let index = 1; index <= REGION_COUNT; index += 1) {
    const region = REGIONS[index];
    const cx = x + (index - 1) * spacing;
    const colors = REGION_COLORS[region.id];
    const cleared = index < current;
    const here = index === current;
    const pulse = here ? 1 + 0.08 * Math.sin(time * 5) : 1;
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(pulse, pulse);
    const badge = ctx.createLinearGradient(0, -22, 0, 22);
    badge.addColorStop(0, colors.top);
    badge.addColorStop(1, colors.bottom);
    ctx.globalAlpha = cleared || here ? 1 : 0.5;
    ctx.fillStyle = badge;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, TAU);
    ctx.fill();
    ctx.lineWidth = here ? 5 : 3;
    ctx.strokeStyle = here ? PALETTE.gold : cleared ? PALETTE.mint : 'rgba(255,255,255,0.5)';
    ctx.stroke();
    drawRegionIcon(ctx, region.id, 0, 0, 30, '#ffffff');
    ctx.restore();
    text(ctx, region.name.replace('Sunlit ', '').replace('Sunken ', ''), cx, y + 46, { size: 14, align: 'center', color: here ? PALETTE.gold : PALETTE.pearl, stroke: 'rgba(2,22,32,0.9)', strokeWidth: 3 });
    if (cleared) {
      text(ctx, '✓', cx + 20, y - 14, { size: 22, align: 'center', color: PALETTE.mint, stroke: 'rgba(2,22,32,0.9)', strokeWidth: 4 });
    }
  }
  ctx.restore();
}
