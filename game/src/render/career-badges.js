// The captain's career as rows of badges for the title screen: the workshop's talents with level
// pips, the eighteen medals, the four bosses beaten and the four anchors owned. A badge is dark
// until the career earns it, then it lights up, so the whole page reads as progress at a glance.

import { PALETTE } from '../core/config.js';
import { TAU } from '../core/math.js';
import { maxLevel } from '../data/talents.js';
import { drawAnchorShape } from './anchor-shapes.js';
import { drawBossIcon } from './chart-art.js';
import { drawIcon } from './icons.js';
import { text, measure } from './ui.js';

const DIM_FILL = 'rgba(255, 255, 255, 0.07)';
const DIM_ICON = 'rgba(180, 205, 215, 0.3)';

/** A round badge: gold ring and warm glow when lit, a faint empty socket when not. */
function medallion(ctx, x, y, radius, lit, tint = PALETTE.gold) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = lit ? 'rgba(255, 200, 61, 0.2)' : DIM_FILL;
  ctx.fill();
  ctx.lineWidth = lit ? 2.5 : 1.5;
  ctx.strokeStyle = lit ? tint : 'rgba(180, 205, 215, 0.22)';
  ctx.stroke();
  ctx.restore();
}

/** "WORKSHOP  6/19" style heading, with the count in gold once there is something to show. */
function heading(ctx, label, value, total, x, y) {
  text(ctx, label, x, y, { size: 14, color: PALETTE.mint });
  text(ctx, `${value}/${total}`, x + measure(ctx, label, 14) + 10, y, { size: 14, color: value > 0 ? PALETTE.gold : PALETTE.steel });
}

/** Spread `count` badges `step` apart along a row starting at x. */
const slotX = (x, step, index) => x + index * step;

/** Nine talent circles, each with a pip per level the workshop offers, filled per level owned. */
export function drawWorkshopRow(ctx, game, x, y) {
  const { progress, content } = game;
  heading(ctx, 'WORKSHOP', progress.talentTotal, content.counts.talentLevels, x, y);
  content.talents.forEach((talent, index) => {
    const level = progress.talentLevel(talent.id);
    const cx = slotX(x + 16, 37, index);
    const cy = y + 26;
    medallion(ctx, cx, cy, 15, level > 0);
    drawIcon(ctx, talent.icon, cx, cy, 20, level > 0 ? PALETTE.cream : DIM_ICON);
    const pips = maxLevel(talent);
    for (let pip = 0; pip < pips; pip += 1) {
      ctx.beginPath();
      ctx.arc(cx + (pip - (pips - 1) / 2) * 8, cy + 23, 2.7, 0, TAU);
      ctx.fillStyle = pip < level ? PALETTE.gold : 'rgba(180, 205, 215, 0.25)';
      ctx.fill();
    }
  });
}

/** The eighteen medals in two rows of nine; earned ones show their own icon, the rest a lock. */
export function drawMedalRows(ctx, game, x, y) {
  const { progress, content } = game;
  heading(ctx, 'MEDALS', progress.medalCount, content.counts.medals, x, y);
  content.medals.forEach((medal, index) => {
    const earned = progress.hasMedal(medal.id);
    const cx = slotX(x + 16, 37, index % 9);
    const cy = y + 24 + Math.floor(index / 9) * 34;
    medallion(ctx, cx, cy, 14, earned);
    drawIcon(ctx, earned ? medal.icon : 'lock', cx, cy, earned ? 19 : 15, earned ? PALETTE.gold : DIM_ICON);
  });
}

/** The four bosses; a beaten one shows its portrait in full colour, an unbeaten one a shadow. */
export function drawBossRow(ctx, game, x, y) {
  const { progress, content } = game;
  const slain = content.bosses.filter((boss) => progress.bossesDown(boss.id) > 0).length;
  heading(ctx, 'BOSSES', slain, content.counts.bosses, x, y);
  content.bosses.forEach((boss, index) => {
    const beaten = progress.bossesDown(boss.id) > 0;
    const cx = slotX(x + 20, 42, index);
    const cy = y + 32;
    medallion(ctx, cx, cy, 20, beaten, PALETTE.coral);
    drawBossIcon(ctx, boss.id, cx, cy, 30, beaten ? PALETTE.cream : DIM_ICON, beaten ? 'rgba(18, 11, 5, 0.7)' : 'rgba(0, 0, 0, 0.12)');
  });
}

/** The four anchors; owned ones are drawn in full, the others as a dark outline of an anchor. */
export function drawAnchorRow(ctx, game, x, y) {
  const { progress, content } = game;
  heading(ctx, 'ANCHORS', progress.owned, content.counts.anchors, x, y);
  content.anchors.forEach((anchor, index) => {
    const owned = progress.isUnlocked(anchor.id);
    const cx = slotX(x + 20, 42, index);
    const cy = y + 32;
    medallion(ctx, cx, cy, 20, owned, PALETTE.mint);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(0.68, 0.68);
    if (!owned) ctx.globalAlpha = 0.22;
    drawAnchorShape(ctx, anchor.id, 0);
    ctx.restore();
  });
}
