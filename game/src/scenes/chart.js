// The sea chart, shown before each region: the whole voyage on parchment, where you are, what
// waits in the region ahead, and two real choices: calm or stormy seas (more creatures, a
// tougher boss, half again as much score) and an optional bounty contract worth extra salvage.

import { W, H, PALETTE, FONT_TITLE } from '../core/config.js';
import { TAU } from '../core/math.js';
import { REGIONS, REGION_COUNT, regionIndexOf, lapOf } from '../data/regions.js';
import { FINAL_WAVE } from '../data/waves.js';
import { offerContracts } from '../data/contracts.js';
import { takeContract } from '../sim/contract-tracker.js';
import { drawParchment, drawCompass, drawRegionIcon, drawBossIcon, REGION_COLORS } from '../render/chart-art.js';
import { drawIcon } from '../render/icons.js';
import { text, panel, button, inRect, roundRect, wrap, keycap } from '../render/ui.js';

const CARD = { w: 272, h: 262, gap: 30, y: 148 };
const CALM_BUTTON = { x: 50, y: 484, w: 384, h: 68 };
const STORM_BUTTON = { x: 50, y: 562, w: 384, h: 68 };
const CONTRACT = { x: 460, y: 512, w: 250, h: 118, gap: 14 };
const SAIL_BUTTON = { x: W / 2 - 190, y: 646, w: 380, h: 60 };
const INK = '#5a3a18';

function cardX(index) {
  const total = REGION_COUNT * CARD.w + (REGION_COUNT - 1) * CARD.gap;
  return (W - total) / 2 + index * (CARD.w + CARD.gap);
}

function contractRect(index) {
  return { x: CONTRACT.x + index * (CONTRACT.w + CONTRACT.gap), y: CONTRACT.y, w: CONTRACT.w, h: CONTRACT.h };
}

export class ChartScene {
  enter(game) {
    this.world = game.run.world;
    this.nextWave = this.world.wave + 1;
    this.regionIndex = regionIndexOf(this.nextWave);
    this.stormy = false;
    this.picked = -1;
    this.offers = offerContracts(this.world.rng, REGIONS[this.regionIndex].id);
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

  pickContract(index, game) {
    if (index >= this.offers.length) return;
    this.picked = this.picked === index ? -1 : index;
    game.audio.play('click');
  }

  sail(game) {
    const { world } = this;
    world.stormy = this.stormy;
    world.boat.invuln = 1.5;
    takeContract(world, this.picked >= 0 ? this.offers[this.picked] : null);
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
    else this.offers.forEach((_, index) => { if (inRect(mx, my, contractRect(index))) this.hover = `c${index}`; });

    if (input.wasPressed('KeyM')) game.audio.toggleMute();
    if (this.elapsed < 0.3) return;
    if (input.wasPressed('Digit1')) this.choose(false, game);
    if (input.wasPressed('Digit2')) this.choose(true, game);
    ['Digit3', 'Digit4', 'Digit5'].forEach((code, index) => {
      if (input.wasPressed(code)) this.pickContract(index, game);
    });
    if (input.mouse.pressed) {
      if (this.hover === 'calm') this.choose(false, game);
      else if (this.hover === 'storm') this.choose(true, game);
      else if (this.hover === 'sail') this.sail(game);
      else if (this.hover.startsWith('c')) this.pickContract(Number(this.hover.slice(1)), game);
    }
    if (input.anyPressed('Enter', 'Space')) this.sail(game);
  }

  draw(ctx, game) {
    ctx.drawImage(this.paper, 0, 0);
    const t = game.clock;
    const lap = lapOf(this.nextWave);
    text(ctx, 'THE VOYAGE', W / 2, 84, {
      size: 60, align: 'center', font: FONT_TITLE, weight: 'normal', color: INK, stroke: 'rgba(255, 240, 200, 0.9)', strokeWidth: 8,
    });
    const subtitle = this.world.endless
      ? `Deep Dive, lap ${lap + 1}. The sea never ends; every lap bites harder.`
      : 'Four regions, four bosses. Chart your course.';
    text(ctx, subtitle, W / 2, 116, { size: 21, align: 'center', color: '#7a5a30', weight: 'normal' });

    for (let index = 0; index < REGION_COUNT; index += 1) this.drawRegionCard(ctx, index, t);
    for (let index = 0; index < REGION_COUNT - 1; index += 1) {
      const x = cardX(index) + CARD.w + CARD.gap / 2;
      ctx.strokeStyle = 'rgba(90, 58, 24, 0.7)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 7, CARD.y + 130);
      ctx.lineTo(x + 6, CARD.y + 142);
      ctx.lineTo(x - 7, CARD.y + 154);
      ctx.stroke();
    }

    const region = REGIONS[this.regionIndex];
    const waveInLap = ((this.nextWave - 1) % FINAL_WAVE) + 1;
    const waveLabel = this.world.endless ? `Wave ${this.nextWave}` : `Wave ${waveInLap} of ${FINAL_WAVE}`;
    const lines = wrap(ctx, `${waveLabel}. ${region.blurb}`, 1040, 20);
    lines.slice(0, 2).forEach((line, row) => text(ctx, line, W / 2, 440 + row * 24, { size: 20, align: 'center', color: INK, weight: 'normal' }));

    text(ctx, 'THE SEAS', CALM_BUTTON.x + 4, CALM_BUTTON.y - 8, { size: 15, color: '#9a7a50' });
    this.drawChoice(ctx, CALM_BUTTON, 'CALM SEAS', 'Normal creatures and boss', !this.stormy, '1');
    this.drawChoice(ctx, STORM_BUTTON, 'STORMY SEAS', '+30% creatures, +50% score, tougher boss', this.stormy, '2');

    text(ctx, 'BOUNTY CONTRACT  (optional, one per region)', CONTRACT.x + 4, CONTRACT.y - 8, { size: 15, color: '#9a7a50' });
    this.offers.forEach((offer, index) => this.drawContract(ctx, offer, index));

    button(ctx, SAIL_BUTTON, 'SET SAIL', { primary: true, hover: this.hover === 'sail', size: 32 });
    keycap(ctx, 'ENTER', SAIL_BUTTON.x + SAIL_BUTTON.w + 18, SAIL_BUTTON.y + 40, { size: 15, color: INK });
    drawCompass(ctx, 86, H - 44, 24, t);
  }

  drawRegionCard(ctx, index, time) {
    const region = REGIONS[index + 1];
    const colors = REGION_COLORS[region.id];
    const cleared = index + 1 < this.regionIndex;
    const here = index + 1 === this.regionIndex;
    const x = cardX(index);
    const lift = here ? -8 + Math.sin(time * 3) * 2 : 0;
    ctx.save();
    ctx.translate(0, lift);
    if (here) {
      ctx.shadowColor = 'rgba(255, 200, 61, 0.9)';
      ctx.shadowBlur = 28;
    }
    panel(ctx, x, CARD.y, CARD.w, CARD.h, {
      fill: 'rgba(255, 248, 225, 0.6)', stroke: here ? '#c8880f' : 'rgba(90, 58, 24, 0.7)', lineWidth: here ? 6 : 3, radius: 22,
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = here || cleared ? 1 : 0.72;

    ctx.save();
    roundRect(ctx, x + 6, CARD.y + 6, CARD.w - 12, 112, 18);
    ctx.clip();
    const sea = ctx.createLinearGradient(0, CARD.y, 0, CARD.y + 118);
    sea.addColorStop(0, colors.top);
    sea.addColorStop(1, colors.bottom);
    ctx.fillStyle = sea;
    ctx.fillRect(x, CARD.y, CARD.w, 120);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3;
    for (let row = 0; row < 4; row += 1) {
      ctx.beginPath();
      for (let px = 0; px <= CARD.w; px += 20) {
        const py = CARD.y + 26 + row * 24 + Math.sin(px * 0.05 + time * 1.2 + row) * 4;
        if (px === 0) ctx.moveTo(x + px, py);
        else ctx.lineTo(x + px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    drawRegionIcon(ctx, region.id, x + CARD.w / 2 + 14, CARD.y + 66, 78, '#ffffff');
    text(ctx, `REGION ${index + 1}`, x + 20, CARD.y + 32, { size: 14, color: 'rgba(255,255,255,0.9)', stroke: 'rgba(0,0,0,0.35)', strokeWidth: 3 });

    const badge = cleared ? 'CLEARED' : here ? 'YOU ARE HERE' : 'AHEAD';
    const badgeColor = cleared ? '#2c9b5a' : here ? '#d89a12' : '#7f6a4a';
    roundRect(ctx, x + CARD.w - 134, CARD.y + 14, 116, 25, 12);
    ctx.fillStyle = badgeColor;
    ctx.fill();
    text(ctx, badge, x + CARD.w - 76, CARD.y + 32, { size: 13, align: 'center', color: '#ffffff' });

    text(ctx, region.name, x + CARD.w / 2, CARD.y + 152, { size: 25, align: 'center', color: INK });
    const hazard = wrap(ctx, region.hazard, CARD.w - 36, 16);
    hazard.slice(0, 2).forEach((line, row) => {
      text(ctx, line, x + CARD.w / 2, CARD.y + 174 + row * 19, { size: 16, align: 'center', color: '#7a5a30', weight: 'normal' });
    });
    ctx.fillStyle = 'rgba(90, 58, 24, 0.12)';
    roundRect(ctx, x + 14, CARD.y + 202, CARD.w - 28, 48, 12);
    ctx.fill();
    drawBossIcon(ctx, region.boss, x + 46, CARD.y + 227, 44, INK, 'rgba(255, 240, 200, 0.9)');
    text(ctx, 'BOSS', x + 80, CARD.y + 220, { size: 12, color: '#9a7a50' });
    text(ctx, region.bossName, x + 80, CARD.y + 241, { size: 17, color: INK });
    if (cleared) {
      text(ctx, '✓', x + CARD.w - 34, CARD.y + 240, { size: 30, align: 'center', color: '#2c9b5a' });
    }
    ctx.restore();

    if (here) this.drawBoat(ctx, x + 44, CARD.y + 92 + lift, time);
  }

  /** A tiny sailing boat perched on the current region's sea. */
  drawBoat(ctx, x, y, time) {
    ctx.save();
    ctx.translate(x, y + Math.sin(time * 3) * 3);
    ctx.scale(0.9, 0.9);
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
    const iconX = rect.x + 42;
    const iconY = rect.y + rect.h / 2;
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (key === '1') {
      ctx.arc(iconX, iconY, 11, 0, TAU);
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * TAU;
        ctx.moveTo(iconX + Math.cos(a) * 16, iconY + Math.sin(a) * 16);
        ctx.lineTo(iconX + Math.cos(a) * 22, iconY + Math.sin(a) * 22);
      }
      ctx.stroke();
    } else {
      ctx.moveTo(iconX + 6, iconY - 24);
      ctx.lineTo(iconX - 11, iconY + 2);
      ctx.lineTo(iconX - 1, iconY + 2);
      ctx.lineTo(iconX - 6, iconY + 24);
      ctx.lineTo(iconX + 12, iconY - 5);
      ctx.lineTo(iconX + 2, iconY - 5);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, label, rect.x + 82, rect.y + 31, { size: 26, color: INK });
    text(ctx, detail, rect.x + 82, rect.y + 54, { size: 15, color: selected ? '#5a3a18' : '#7a5a30', weight: 'normal' });
    keycap(ctx, key, rect.x + rect.w - 40, rect.y + 30, { size: 15, color: INK });
    ctx.restore();
  }

  drawContract(ctx, offer, index) {
    const rect = contractRect(index);
    const selected = this.picked === index;
    const hovered = this.hover === `c${index}`;
    ctx.save();
    ctx.translate(0, hovered ? -3 : 0);
    if (selected) {
      ctx.shadowColor = 'rgba(255, 200, 61, 0.9)';
      ctx.shadowBlur = 20;
    }
    panel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill: selected ? 'rgba(255, 214, 90, 0.95)' : 'rgba(255, 248, 225, 0.55)',
      stroke: selected ? '#a86d0a' : 'rgba(90, 58, 24, 0.6)',
      lineWidth: selected ? 5 : 3,
      radius: 18,
    });
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(rect.x + 36, rect.y + 38, 24, 0, TAU);
    ctx.fillStyle = selected ? 'rgba(90, 58, 24, 0.18)' : 'rgba(90, 58, 24, 0.1)';
    ctx.fill();
    drawIcon(ctx, offer.icon, rect.x + 36, rect.y + 38, 32, INK);
    text(ctx, offer.name, rect.x + 70, rect.y + 34, { size: 19, color: INK });
    keycap(ctx, String(index + 3), rect.x + rect.w - 28, rect.y + 28, { size: 13, color: INK });
    const lines = wrap(ctx, offer.text, rect.w - 28, 15);
    lines.slice(0, 3).forEach((line, row) => {
      text(ctx, line, rect.x + 16, rect.y + 70 + row * 18, { size: 15, color: '#6a4a24', weight: 'normal' });
    });
    text(ctx, `+${offer.reward} SALVAGE`, rect.x + rect.w - 14, rect.y + rect.h - 12, {
      size: 15, align: 'right', color: selected ? '#5a3a18' : '#2c8a50',
    });
    ctx.restore();
  }
}
