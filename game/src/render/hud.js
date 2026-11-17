// The heads-up display, all drawn on the canvas so screenshots capture it: life rings, tide
// meter, wave and region, score, combo, boss health, the wave banner and the aiming reticle.

import { W, H, PALETTE, FONT_TITLE, BOAT, ANCHOR, HIT_TIERS } from '../config.js';
import { TAU, easeOutBack, formatScore, clamp } from '../math.js';
import { text, title, panel, roundRect, keycap, measure } from './ui.js';
import { drawLifeRing } from '../pickups.js';
import { comboMultiplier } from '../combat.js';
import { FINAL_WAVE, WAVES } from '../waves.js';
import { regionIndexOf } from '../regions.js';

function drawLives(ctx, world) {
  const { boat } = world;
  for (let i = 0; i < boat.maxHp; i += 1) {
    drawLifeRing(ctx, 40 + i * 40, 42, 15, i < boat.hp);
  }
}

function drawMeters(ctx, world) {
  const x = 22;
  const meterWidth = 252;

  // Tide surge meter, a wavy fill in a rounded trough.
  const y = 70;
  panel(ctx, x, y, meterWidth, 28, { radius: 14, fill: 'rgba(4, 35, 47, 0.8)', stroke: world.tide >= 1 ? PALETTE.mint : 'rgba(234,252,247,0.4)', shadow: false });
  ctx.save();
  roundRect(ctx, x + 3, y + 3, meterWidth - 6, 22, 11);
  ctx.clip();
  const fillWidth = (meterWidth - 6) * world.tide;
  const fill = ctx.createLinearGradient(0, y, 0, y + 28);
  fill.addColorStop(0, world.tide >= 1 ? '#c8fff0' : '#6ff2c5');
  fill.addColorStop(1, '#1fae93');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 28);
  for (let px = 0; px <= fillWidth; px += 4) {
    ctx.lineTo(x + 3 + px, y + 6 + Math.sin(px * 0.14 + world.time * 5) * 2);
  }
  ctx.lineTo(x + 3 + fillWidth, y + 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const ready = world.tide >= 1;
  text(ctx, ready ? 'TIDE SURGE READY' : 'TIDE SURGE', x + meterWidth / 2, y + 21, {
    size: 16, align: 'center', color: ready ? '#08323a' : '#eafcf7', stroke: ready ? null : 'rgba(2,22,32,0.8)', strokeWidth: 3,
  });
  if (ready) keycap(ctx, 'SPACE', x + meterWidth + 10, y + 22, { size: 14 });

  // Dash and slam cooldown pips.
  const bars = [
    { label: 'DASH', ready: 1 - clamp(world.boat.dashCd / (BOAT.dashCooldown * world.build.dashCooldown), 0, 1), key: 'SHIFT' },
    { label: 'SLAM', ready: 1 - clamp(world.anchor.slamCd / (ANCHOR.slamCooldown * world.build.slamCooldown), 0, 1), key: 'CLICK' },
  ];
  bars.forEach((bar, index) => {
    const by = 106 + index * 22;
    text(ctx, bar.label, x + 2, by + 12, { size: 14, color: 'rgba(234,252,247,0.9)', stroke: 'rgba(2,22,32,0.8)', strokeWidth: 3 });
    roundRect(ctx, x + 54, by + 2, 136, 11, 5);
    ctx.fillStyle = 'rgba(4, 35, 47, 0.8)';
    ctx.fill();
    roundRect(ctx, x + 54, by + 2, 136 * bar.ready, 11, 5);
    ctx.fillStyle = bar.ready >= 1 ? PALETTE.gold : '#8fb0c4';
    ctx.fill();
    if (bar.ready >= 1) text(ctx, bar.key, x + 198, by + 12, { size: 12, color: 'rgba(234,252,247,0.75)', weight: 'normal' });
  });
}

function drawWaveInfo(ctx, world) {
  const def = WAVES[world.wave];
  if (!def) return;
  const boss = world.enemies.find((enemy) => enemy.boss);
  const bossWave = !!def.boss;
  text(ctx, bossWave ? 'BOSS WAVE' : `WAVE ${world.wave} / ${FINAL_WAVE}`, W / 2, 40, {
    size: 36, align: 'center', stroke: 'rgba(2,22,32,0.85)', strokeWidth: 7,
    color: bossWave ? PALETTE.coral : '#ffffff',
  });

  // The region chip: where on the voyage this wave is, and whether the seas are stormy.
  const region = world.region;
  const label = `REGION ${regionIndexOf(world.wave)} · ${region.name.toUpperCase()}`;
  const width = measure(ctx, label, 16) + 34 + (world.stormy ? 100 : 0);
  panel(ctx, W / 2 - width / 2, 48, width, 28, { radius: 14, fill: 'rgba(4, 35, 47, 0.78)', stroke: 'rgba(234,252,247,0.35)', shadow: false, lineWidth: 2 });
  text(ctx, label, W / 2 - (world.stormy ? 50 : 0), 68, { size: 16, align: 'center', color: PALETTE.pearl });
  if (world.stormy) {
    text(ctx, 'STORMY', W / 2 + width / 2 - 56, 68, { size: 16, align: 'center', color: PALETTE.gold });
  }

  if (bossWave) {
    if (!boss) return;
    const barWidth = 620;
    const x = (W - barWidth) / 2;
    const y = 86;
    panel(ctx, x, y, barWidth, 26, { radius: 13, fill: 'rgba(4,35,47,0.85)', stroke: PALETTE.violet, shadow: false });
    const fraction = Math.max(0, boss.hp / boss.maxHp);
    roundRect(ctx, x + 3, y + 3, (barWidth - 6) * fraction, 20, 10);
    const fill = ctx.createLinearGradient(0, y, 0, y + 26);
    fill.addColorStop(0, '#d98cff');
    fill.addColorStop(1, '#7a2fc4');
    ctx.fillStyle = fill;
    ctx.fill();
    text(ctx, boss.def.name.toUpperCase(), W / 2, y + 20, { size: 16, align: 'center', stroke: 'rgba(2,22,32,0.9)', strokeWidth: 3 });
    return;
  }

  const { left, total } = world.director.progress();
  const barWidth = 280;
  const x = (W - barWidth) / 2;
  const y = 86;
  panel(ctx, x, y, barWidth, 16, { radius: 8, fill: 'rgba(4,35,47,0.8)', stroke: 'rgba(234,252,247,0.35)', shadow: false, lineWidth: 2 });
  const remaining = clamp(left / total, 0, 1);
  roundRect(ctx, x + 2, y + 2, (barWidth - 4) * remaining, 12, 6);
  ctx.fillStyle = PALETTE.coral;
  ctx.fill();
  text(ctx, `${left} left`, x + barWidth + 10, y + 14, { size: 15, color: 'rgba(234,252,247,0.9)', weight: 'normal', stroke: 'rgba(2,22,32,0.8)', strokeWidth: 3 });
}

function drawScore(ctx, world, best) {
  text(ctx, formatScore(world.stats.score), W - 28, 50, {
    size: 46, align: 'right', color: '#ffffff', font: FONT_TITLE, weight: 'normal', stroke: 'rgba(2,22,32,0.9)', strokeWidth: 9,
  });
  text(ctx, `BEST ${formatScore(Math.max(best, world.stats.score))}`, W - 28, 76, {
    size: 17, align: 'right', color: PALETTE.pearl, stroke: 'rgba(2,22,32,0.85)', strokeWidth: 4,
  });
  ctx.save();
  ctx.translate(W - 36, 102);
  const glow = ctx.createRadialGradient(-2, -2, 1, 0, 0, 9);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(1, '#e4b8d8');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.fill();
  ctx.restore();
  text(ctx, String(world.purse), W - 54, 109, { size: 24, align: 'right', stroke: 'rgba(2,22,32,0.85)', strokeWidth: 4 });
}

function drawCombo(ctx, world) {
  const { combo } = world;
  if (combo.count < 2) return;
  const fraction = combo.timer / 2.4;
  const pulse = 1 + 0.08 * Math.sin(world.time * 14) * fraction;
  ctx.save();
  ctx.translate(W / 2, H - 112);
  ctx.scale(pulse, pulse);
  text(ctx, `COMBO x${combo.count}`, 0, 0, {
    size: 40, align: 'center', color: PALETTE.gold, font: FONT_TITLE, weight: 'normal', stroke: '#2a1a05', strokeWidth: 9,
  });
  ctx.restore();
  text(ctx, `score x${(comboMultiplier(world) * (world.stormy ? 1.5 : 1)).toFixed(1)}`, W / 2, H - 84, {
    size: 18, align: 'center', color: PALETTE.pearl, stroke: 'rgba(2,22,32,0.85)', strokeWidth: 4,
  });
  roundRect(ctx, W / 2 - 100, H - 74, 200, 8, 4);
  ctx.fillStyle = 'rgba(4,35,47,0.8)';
  ctx.fill();
  roundRect(ctx, W / 2 - 100, H - 74, 200 * fraction, 8, 4);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
}

function drawBanner(ctx, world) {
  const banner = world.banner;
  if (!banner) return;
  const intro = clamp(banner.t / 0.4, 0, 1);
  const outro = clamp((banner.dur - banner.t) / 0.4, 0, 1);
  const alpha = Math.min(intro, outro);
  const scale = 0.7 + 0.3 * easeOutBack(intro);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H * 0.34);
  ctx.scale(scale, scale);
  const clear = banner.title.endsWith('CLEARED');
  title(ctx, banner.title, 0, 0, banner.title.length > 14 ? 78 : 92, clear ? PALETTE.mint : PALETTE.gold);
  text(ctx, banner.sub, 0, 46, {
    size: 32, align: 'center', color: PALETTE.cream, stroke: '#10222d', strokeWidth: 7,
  });
  if (banner.hint) {
    const hintY = 98;
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    const width = Math.min(1100, ctx.measureText(banner.hint).width + 48);
    panel(ctx, -width / 2, hintY - 28, width, 44, { radius: 22, fill: 'rgba(4, 35, 47, 0.78)', stroke: 'rgba(234,252,247,0.35)', shadow: false });
    text(ctx, banner.hint, 0, hintY, { size: 22, align: 'center', weight: 'normal', color: PALETTE.pearl });
  }
  ctx.restore();
}

function drawControlsHint(ctx, world) {
  if (world.stats.time > 18 || world.state === 'won') return;
  const fade = clamp((18 - world.stats.time) / 3, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.9 * fade;
  const items = [['WASD', 'sail'], ['MOUSE', 'swing the anchor'], ['CLICK', 'slam'], ['SHIFT', 'dash'], ['SPACE', 'tide surge']];
  let total = 0;
  const widths = items.map(([key, label]) => {
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    const width = ctx.measureText(key).width + 16 + 8 + ctx.measureText(label).width + 26;
    total += width;
    return width;
  });
  let x = (W - total) / 2;
  const y = H - 16;
  panel(ctx, x - 14, y - 30, total + 20, 42, { radius: 21, fill: 'rgba(4, 35, 47, 0.7)', stroke: null, shadow: false });
  items.forEach(([key, label], index) => {
    const keyWidth = keycap(ctx, key, x, y - 4, { size: 15 });
    text(ctx, label, x + keyWidth + 8, y - 4, { size: 16, weight: 'normal', color: PALETTE.pearl });
    x += widths[index];
  });
  ctx.restore();
}

/** The cursor: a ring that tightens and warms in colour with how hard the anchor is hitting. */
export function drawReticle(ctx, x, y, tier, time) {
  const color = tier > 0 ? HIT_TIERS[tier - 1].color : 'rgba(234, 252, 247, 0.85)';
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(2, 22, 32, 0.8)';
  ctx.lineWidth = 5;
  for (const pass of [0, 1]) {
    if (pass === 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
    }
    ctx.beginPath();
    ctx.arc(0, 0, 12 + Math.sin(time * 6) * 1, 0, TAU);
    ctx.moveTo(-20, 0);
    ctx.lineTo(-7, 0);
    ctx.moveTo(20, 0);
    ctx.lineTo(7, 0);
    ctx.moveTo(0, -20);
    ctx.lineTo(0, -7);
    ctx.moveTo(0, 20);
    ctx.lineTo(0, 7);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHud(ctx, world, best) {
  drawLives(ctx, world);
  drawMeters(ctx, world);
  drawWaveInfo(ctx, world);
  drawScore(ctx, world, best);
  drawCombo(ctx, world);
  drawControlsHint(ctx, world);
  drawBanner(ctx, world);
}
