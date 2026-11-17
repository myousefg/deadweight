// The sea chart, shown before each region: the whole voyage on parchment, where you are, what
// waits in the region ahead, and one real choice: calm seas, or stormy seas for more creatures,
// a tougher boss and half again as much score.

import { W, H, PALETTE, FONT_TITLE } from '../config.js';
import { TAU } from '../math.js';
import { REGIONS, regionIndexOf } from '../regions.js';
import { drawParchment, drawCompass, drawRegionIcon, drawBossIcon, REGION_COLORS } from '../render/chart-art.js';
import { text, panel, button, inRect, roundRect, wrap, keycap } from '../render/ui.js';

const CARD = { w: 340, h: 296, gap: 50, y: 166 };
const CALM_BUTTON = { x: 170, y: 516, w: 430, h: 80 };
const STORM_BUTTON = { x: 680, y: 516, w: 430, h: 80 };
const SAIL_BUTTON = { x: W / 2 - 190, y: 622, w: 380, h: 70 };
const INK = '#5a3a18';

function cardX(index) {
  const total = 3 * CARD.w + 2 * CARD.gap;
  return (W - total) / 2 + index * (CARD.w + CARD.gap);
}

export class ChartScene {
  enter(game) {
    this.world = game.run.world;
    this.nextWave = this.world.wave + 1;
    this.regionIndex = regionIndexOf(this.nextWave);
    this.stormy = false;
    this.elapsed = 0;
    this.hover = '';
    this.paper = document.createElement('canvas');
    this.paper.width = W;
    this.paper.height = H;
    drawParchment(this.paper.getContext('2d'), W, H);
  }

  choose(stormy, game) {
    if (this.stormy === stormy) return;
    this.stormy = stormy;
    game.audio.play('click');
  }

  sail(game) {
    const { world } = this;
    world.stormy = this.stormy;
    world.boat.invuln = 1.5;
    world.startWave(this.nextWave);
    game.audio.play('select');
    game.switchTo('play');
  }

  update(dt, game) {
    const { input } = game;
    this.elapsed += dt;
    const mx = input.mouse.x;
    const my = input.mouse.y;
    this.hover = '';
    if (inRect(mx, my, CALM_BUTTON)) this.hover = 'calm';
    else if (inRect(mx, my, STORM_BUTTON)) this.hover = 'storm';
    else if (inRect(mx, my, SAIL_BUTTON)) this.hover = 'sail';

    if (input.wasPressed('KeyM')) game.audio.toggleMute();
    if (this.elapsed < 0.3) return;
    if (input.wasPressed('Digit1')) this.choose(false, game);
    if (input.wasPressed('Digit2')) this.choose(true, game);
    if (input.mouse.pressed) {
      if (this.hover === 'calm') this.choose(false, game);
      else if (this.hover === 'storm') this.choose(true, game);
      else if (this.hover === 'sail') this.sail(game);
    }
    if (input.anyPressed('Enter', 'Space')) this.sail(game);
  }

  draw(ctx, game) {
    ctx.drawImage(this.paper, 0, 0);
    const t = game.clock;
    text(ctx, 'THE VOYAGE', W / 2, 90, {
      size: 66, align: 'center', font: FONT_TITLE, weight: 'normal', color: INK, stroke: 'rgba(255, 240, 200, 0.9)', strokeWidth: 8,
    });
    text(ctx, 'Three regions, three bosses. Chart your course.', W / 2, 124, { size: 22, align: 'center', color: '#7a5a30', weight: 'normal' });

    for (let index = 0; index < 3; index += 1) this.drawRegionCard(ctx, index, t);
    for (let index = 0; index < 2; index += 1) {
      const x = cardX(index) + CARD.w + CARD.gap / 2;
      ctx.strokeStyle = 'rgba(90, 58, 24, 0.7)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.setLineDash([9, 9]);
      ctx.beginPath();
      ctx.moveTo(x - 22, CARD.y + 150);
      ctx.lineTo(x + 8, CARD.y + 150);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x + 4, CARD.y + 138);
      ctx.lineTo(x + 20, CARD.y + 150);
      ctx.lineTo(x + 4, CARD.y + 162);
      ctx.stroke();
    }

    const region = REGIONS[this.regionIndex];
    const lines = wrap(ctx, `Wave ${this.nextWave} of 9. ${region.blurb}`, 980, 22);
    lines.forEach((line, row) => text(ctx, line, W / 2, 498 + row * 26, { size: 22, align: 'center', color: INK, weight: 'normal' }));

    this.drawChoice(ctx, CALM_BUTTON, 'CALM SEAS', 'Normal creatures and boss', !this.stormy, '1');
    this.drawChoice(ctx, STORM_BUTTON, 'STORMY SEAS', '+30% creatures, +50% score, tougher boss', this.stormy, '2');
    button(ctx, SAIL_BUTTON, 'SET SAIL', { primary: true, hover: this.hover === 'sail', size: 34 });
    keycap(ctx, 'ENTER', SAIL_BUTTON.x + SAIL_BUTTON.w + 18, SAIL_BUTTON.y + 44, { size: 15, color: INK });
    drawCompass(ctx, W - 118, H - 104, 56, t);
  }

  drawRegionCard(ctx, index, time) {
    const region = REGIONS[index + 1];
    const colors = REGION_COLORS[region.id];
    const cleared = index + 1 < this.regionIndex;
    const here = index + 1 === this.regionIndex;
    const x = cardX(index);
    const lift = here ? -10 + Math.sin(time * 3) * 2 : 0;
    ctx.save();
    ctx.translate(0, lift);
    if (here) {
      ctx.shadowColor = 'rgba(255, 200, 61, 0.9)';
      ctx.shadowBlur = 30;
    }
    panel(ctx, x, CARD.y, CARD.w, CARD.h, {
      fill: 'rgba(255, 248, 225, 0.6)', stroke: here ? '#c8880f' : 'rgba(90, 58, 24, 0.7)', lineWidth: here ? 6 : 3, radius: 22,
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = here || cleared ? 1 : 0.72;

    ctx.save();
    roundRect(ctx, x + 6, CARD.y + 6, CARD.w - 12, 132, 18);
    ctx.clip();
    const sea = ctx.createLinearGradient(0, CARD.y, 0, CARD.y + 138);
    sea.addColorStop(0, colors.top);
    sea.addColorStop(1, colors.bottom);
    ctx.fillStyle = sea;
    ctx.fillRect(x, CARD.y, CARD.w, 140);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3;
    for (let row = 0; row < 4; row += 1) {
      ctx.beginPath();
      for (let px = 0; px <= CARD.w; px += 20) {
        const py = CARD.y + 30 + row * 28 + Math.sin(px * 0.05 + time * 1.2 + row) * 4;
        if (px === 0) ctx.moveTo(x + px, py);
        else ctx.lineTo(x + px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    drawRegionIcon(ctx, region.id, x + CARD.w / 2, CARD.y + 72, 96, '#ffffff');
    text(ctx, `REGION ${index + 1}`, x + 22, CARD.y + 34, { size: 15, color: 'rgba(255,255,255,0.9)', stroke: 'rgba(0,0,0,0.35)', strokeWidth: 3 });

    const badge = cleared ? 'CLEARED' : here ? 'YOU ARE HERE' : 'AHEAD';
    const badgeColor = cleared ? '#2c9b5a' : here ? '#d89a12' : '#7f6a4a';
    roundRect(ctx, x + CARD.w - 150, CARD.y + 16, 128, 28, 14);
    ctx.fillStyle = badgeColor;
    ctx.fill();
    text(ctx, badge, x + CARD.w - 86, CARD.y + 36, { size: 15, align: 'center', color: '#ffffff' });

    text(ctx, region.name, x + CARD.w / 2, CARD.y + 178, { size: 30, align: 'center', color: INK });
    const hazard = wrap(ctx, region.hazard, CARD.w - 40, 19);
    text(ctx, hazard[0], x + CARD.w / 2, CARD.y + 208, { size: 19, align: 'center', color: '#7a5a30', weight: 'normal' });
    ctx.fillStyle = 'rgba(90, 58, 24, 0.12)';
    roundRect(ctx, x + 20, CARD.y + 226, CARD.w - 40, 58, 14);
    ctx.fill();
    drawBossIcon(ctx, region.boss, x + 56, CARD.y + 255, 52, INK, 'rgba(255, 240, 200, 0.9)');
    text(ctx, 'BOSS', x + 96, CARD.y + 248, { size: 14, color: '#9a7a50' });
    text(ctx, region.bossName, x + 96, CARD.y + 272, { size: 21, color: INK });
    if (cleared) {
      text(ctx, '✓', x + CARD.w - 46, CARD.y + 270, { size: 34, align: 'center', color: '#2c9b5a' });
    }
    ctx.restore();

    if (here) this.drawBoat(ctx, x + CARD.w - 56, CARD.y - 4 + lift, time);
  }

  /** A tiny sailing boat perched on the current region's card. */
  drawBoat(ctx, x, y, time) {
    ctx.save();
    ctx.translate(x, y + Math.sin(time * 3) * 3);
    ctx.fillStyle = '#6f4023';
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(26, 0);
    ctx.lineTo(18, 12);
    ctx.lineTo(-18, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff1d6';
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(18, -4);
    ctx.lineTo(0, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6f4023';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(-12, -31);
    ctx.lineTo(0, -26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawChoice(ctx, rect, label, detail, selected, key) {
    const hovered = this.hover === (key === '1' ? 'calm' : 'storm');
    ctx.save();
    ctx.translate(0, hovered ? -3 : 0);
    if (selected) {
      ctx.shadowColor = 'rgba(255, 200, 61, 0.9)';
      ctx.shadowBlur = 22;
    }
    panel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill: selected ? 'rgba(255, 214, 90, 0.95)' : 'rgba(255, 248, 225, 0.55)',
      stroke: selected ? '#a86d0a' : 'rgba(90, 58, 24, 0.6)',
      lineWidth: selected ? 5 : 3,
      radius: 20,
    });
    ctx.shadowBlur = 0;
    const iconX = rect.x + 46;
    const iconY = rect.y + rect.h / 2;
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (key === '1') {
      ctx.arc(iconX, iconY, 13, 0, TAU);
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * TAU;
        ctx.moveTo(iconX + Math.cos(a) * 19, iconY + Math.sin(a) * 19);
        ctx.lineTo(iconX + Math.cos(a) * 26, iconY + Math.sin(a) * 26);
      }
      ctx.stroke();
    } else {
      ctx.moveTo(iconX + 6, iconY - 28);
      ctx.lineTo(iconX - 12, iconY + 2);
      ctx.lineTo(iconX - 1, iconY + 2);
      ctx.lineTo(iconX - 7, iconY + 28);
      ctx.lineTo(iconX + 13, iconY - 6);
      ctx.lineTo(iconX + 2, iconY - 6);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, label, rect.x + 96, rect.y + 38, { size: 30, color: INK });
    text(ctx, detail, rect.x + 96, rect.y + 66, { size: 17, color: selected ? '#5a3a18' : '#7a5a30', weight: 'normal' });
    keycap(ctx, key, rect.x + rect.w - 44, rect.y + 34, { size: 16, color: INK });
    ctx.restore();
  }
}
