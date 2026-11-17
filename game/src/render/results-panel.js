// The run summary shared by the victory and game-over screens: a big score, a rank, and a grid
// of the run's numbers.

import { PALETTE, FONT_TITLE } from '../config.js';
import { formatScore, formatTime } from '../math.js';
import { FINAL_WAVE } from '../waves.js';
import { text, panel } from './ui.js';

export function rankFor(score, won) {
  if (!won) {
    if (score < 6000) return 'Barnacle Fodder';
    if (score < 15000) return 'Deckhand';
    return 'Salty Dog';
  }
  if (score < 30000) return 'Kraken Slayer';
  if (score < 50000) return 'Anchor Master';
  return 'Legend of the Deep';
}

export function drawResultsPanel(ctx, world, x, y, width, options = {}) {
  const { won = false, newBest = false, best = 0 } = options;
  const height = 292;
  panel(ctx, x, y, width, height, { radius: 24, fill: 'rgba(4, 35, 47, 0.88)' });

  text(ctx, 'FINAL SCORE', x + 36, y + 36, { size: 16, color: PALETTE.pearl });
  text(ctx, formatScore(world.stats.score), x + 36, y + 112, {
    size: 74, color: '#ffffff', font: FONT_TITLE, weight: 'normal', stroke: '#10222d', strokeWidth: 10,
  });
  if (newBest) {
    text(ctx, 'NEW BEST!', x + 36, y + 148, { size: 24, color: PALETTE.gold, stroke: '#2a1a05', strokeWidth: 6 });
  } else if (best > 0) {
    text(ctx, `Best  ${formatScore(best)}`, x + 36, y + 148, { size: 20, color: PALETTE.pearl, weight: 'normal' });
  }

  text(ctx, 'RANK', x + width - 36, y + 36, { size: 16, align: 'right', color: PALETTE.pearl });
  text(ctx, rankFor(world.stats.score, won), x + width - 36, y + 86, {
    size: 32, align: 'right', color: won ? PALETTE.gold : PALETTE.coral, stroke: '#10222d', strokeWidth: 7,
  });
  const reached = won ? 'Kraken defeated' : `Reached wave ${world.wave} of ${FINAL_WAVE}`;
  text(ctx, reached, x + width - 36, y + 120, { size: 19, align: 'right', color: PALETTE.cream, weight: 'normal' });

  const tiles = [
    ['SUNK', String(world.stats.kills)],
    ['BEST COMBO', `x${world.stats.bestCombo}`],
    ['PEARLS', String(world.stats.pearls)],
    ['SLAMS', String(world.stats.slams)],
    ['HITS TAKEN', String(world.stats.hits)],
    ['TIME', formatTime(world.stats.time)],
  ];
  const tileWidth = (width - 72 - 5 * 12) / 6;
  tiles.forEach(([label, value], index) => {
    const tx = x + 36 + index * (tileWidth + 12);
    const ty = y + 172;
    panel(ctx, tx, ty, tileWidth, 90, { radius: 14, fill: 'rgba(255, 255, 255, 0.07)', stroke: null, shadow: false });
    text(ctx, value, tx + tileWidth / 2, ty + 48, { size: 30, align: 'center' });
    text(ctx, label, tx + tileWidth / 2, ty + 74, { size: 12, align: 'center', color: PALETTE.pearl });
  });
}
