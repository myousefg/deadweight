// The run summary shared by the victory and game-over screens: a big score, a rank, a grid of the
// run's numbers, and a strip for any medals this voyage earned.

import { PALETTE, FONT_TITLE, W } from '../core/config.js';
import { TAU, formatScore, formatTime } from '../core/math.js';
import { FINAL_WAVE } from '../data/waves.js';
import { MEDALS } from '../data/medals.js';
import { text, panel } from './ui.js';
import { drawIcon } from './icons.js';
import { drawBossIcon } from './chart-art.js';
import { BOSSES } from '../enemies/index.js';

export function rankFor(score, won, endless = false, wave = 0) {
  if (endless) {
    if (wave < 6) return 'Shallow Diver';
    if (wave < 13) return 'Deep Diver';
    if (wave < 22) return 'Abyss Walker';
    return 'Leviathan';
  }
  if (!won) {
    if (score < 8000) return 'Barnacle Fodder';
    if (score < 22000) return 'Deckhand';
    if (score < 42000) return 'Salty Dog';
    return 'Sea Wolf';
  }
  if (score < 45000) return 'Kraken Slayer';
  if (score < 75000) return 'Anchor Master';
  return 'Legend of the Deep';
}

/** The four bosses as portraits: lit for each one this voyage sank, a shadow for the rest. */
function drawBossRoll(ctx, world, cx, cy) {
  const slain = new Set(world.stats.bossIds);
  BOSSES.forEach((boss, index) => {
    const x = cx + (index - 1.5) * 28;
    const down = slain.has(boss.id);
    ctx.beginPath();
    ctx.arc(x, cy, 13, 0, TAU);
    ctx.fillStyle = down ? 'rgba(255, 200, 61, 0.22)' : 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = down ? 2 : 1.2;
    ctx.strokeStyle = down ? PALETTE.gold : 'rgba(180, 205, 215, 0.25)';
    ctx.stroke();
    drawBossIcon(ctx, boss.id, x, cy, 18, down ? PALETTE.cream : 'rgba(180, 205, 215, 0.3)', down ? 'rgba(18, 11, 5, 0.7)' : 'rgba(0, 0, 0, 0.1)');
  });
}

export function drawResultsPanel(ctx, world, x, y, width, options = {}) {
  const { won = false, newBest = false, best = 0, salvage = 0 } = options;
  const { endless } = world;
  const height = 292;
  panel(ctx, x, y, width, height, { radius: 24, fill: 'rgba(4, 35, 47, 0.88)' });

  text(ctx, 'FINAL SCORE', x + 36, y + 36, { size: 16, color: PALETTE.pearl });
  text(ctx, formatScore(world.stats.score), x + 36, y + 112, {
    size: 74, color: '#ffffff', font: FONT_TITLE, weight: 'normal', stroke: '#10222d', strokeWidth: 10,
  });
  if (newBest) {
    text(ctx, endless ? 'NEW DEEPEST DIVE!' : 'NEW BEST!', x + 36, y + 148, { size: 24, color: PALETTE.gold, stroke: '#2a1a05', strokeWidth: 6 });
  } else if (best > 0 && !endless) {
    text(ctx, `Best  ${formatScore(best)}`, x + 36, y + 148, { size: 20, color: PALETTE.pearl, weight: 'normal' });
  }

  text(ctx, 'RANK', x + width - 36, y + 36, { size: 16, align: 'right', color: PALETTE.pearl });
  text(ctx, rankFor(world.stats.score, won, endless, world.wave), x + width - 36, y + 86, {
    size: 32, align: 'right', color: won ? PALETTE.gold : PALETTE.coral, stroke: '#10222d', strokeWidth: 7,
  });
  const reached = won ? 'Kraken defeated' : endless ? `Reached wave ${world.wave} of the Deep Dive` : `Reached wave ${world.wave} of ${FINAL_WAVE}`;
  text(ctx, reached, x + width - 36, y + 120, { size: 20, align: 'right', color: PALETTE.cream, weight: 'normal' });
  if (salvage > 0) {
    text(ctx, `+${salvage} SALVAGE BANKED`, x + width - 36, y + 154, { size: 24, align: 'right', color: PALETTE.gold, stroke: '#2a1a05', strokeWidth: 6 });
  }

  const tiles = [
    ['SUNK', String(world.stats.kills)],
    ['BEST COMBO', `x${world.stats.bestCombo}`],
    ['BOSSES', endless ? String(world.stats.bosses) : `${world.stats.bosses} / 4`],
    ['MINES', String(world.stats.mines)],
    ['HITS TAKEN', String(world.stats.hits)],
    ['TIME', formatTime(world.stats.time)],
  ];
  const tileWidth = (width - 72 - 5 * 12) / 6;
  tiles.forEach(([label, value], index) => {
    const tx = x + 36 + index * (tileWidth + 12);
    const ty = y + 172;
    panel(ctx, tx, ty, tileWidth, 90, { radius: 14, fill: 'rgba(255, 255, 255, 0.07)', stroke: null, shadow: false });
    if (label === 'BOSSES' && !endless) {
      drawBossRoll(ctx, world, tx + tileWidth / 2, ty + 34);
      text(ctx, value, tx + tileWidth / 2, ty + 74, { size: 12, align: 'center', color: PALETTE.pearl });
      return;
    }
    text(ctx, value, tx + tileWidth / 2, ty + 48, { size: 30, align: 'center' });
    text(ctx, label, tx + tileWidth / 2, ty + 74, { size: 12, align: 'center', color: PALETTE.pearl });
  });
}

/**
 * A strip under the panel: medals earned this voyage (up to three, with a count for the rest),
 * or, when there are none, a line about contracts and the medal case.
 */
export function drawMedalStrip(ctx, world, medals, owned, y) {
  const shown = medals.slice(0, 3);
  if (shown.length === 0) {
    const contracts = world.stats.contracts;
    text(ctx, `${contracts} ${contracts === 1 ? 'contract' : 'contracts'} finished  ·  ${owned} of ${MEDALS.length} medals in the case`, W / 2, y + 26, {
      size: 18, align: 'center', color: PALETTE.pearl, weight: 'normal', stroke: '#10222d', strokeWidth: 5,
    });
    return;
  }
  const chip = 268;
  const total = shown.length * chip + (shown.length - 1) * 14;
  let x = (W - total) / 2;
  const more = medals.length - shown.length;
  text(ctx, more > 0 ? `NEW MEDALS   +${more} more in the log` : 'NEW MEDALS', W / 2, y - 4, { size: 14, align: 'center', color: PALETTE.gold, stroke: '#10222d', strokeWidth: 4 });
  for (const medal of shown) {
    panel(ctx, x, y + 4, chip, 44, { radius: 22, fill: 'rgba(60, 40, 12, 0.9)', stroke: PALETTE.gold, lineWidth: 3, shadow: false });
    drawIcon(ctx, medal.icon, x + 28, y + 26, 28, PALETTE.gold);
    text(ctx, medal.name, x + 54, y + 33, { size: 19, color: PALETTE.cream });
    x += chip + 14;
  }
}
