// The dock: where salvage from finished voyages is spent and the captain's career is shown.
// Three tabs: ANCHORS (buy and equip anchors that play differently), WORKSHOP (permanent talents
// with several levels) and LOG (medals, boss kills and lifetime numbers). Everything you own and
// wear is saved between visits.

import { W, H, PALETTE, FONT_TITLE } from '../config.js';
import { clamp, formatScore } from '../math.js';
import { ANCHOR_TYPES, anchorStats } from '../anchor-types.js';
import { TALENTS, maxLevel } from '../talents.js';
import { MEDALS } from '../medals.js';
import { REGIONS } from '../regions.js';
import { drawAnchorShape } from '../render/anchor-shapes.js';
import { drawIcon } from '../render/icons.js';
import { drawBossIcon } from '../render/chart-art.js';
import { text, panel, button, inRect, roundRect, wrap, keycap } from '../render/ui.js';

const TABS = [
  { id: 'anchors', label: 'ANCHORS', icon: 'anchor' },
  { id: 'workshop', label: 'WORKSHOP', icon: 'chain' },
  { id: 'log', label: 'CAPTAIN’S LOG', icon: 'medal' },
];
const TAB = { w: 236, h: 46, y: 112, gap: 14 };
const BACK_BUTTON = { x: 44, y: 654, w: 190, h: 52 };
const CARD = { w: 270, h: 432, gap: 24, y: 178 };
const TILE = { w: 380, h: 136, gapX: 20, gapY: 14, y: 178 };
const MEDAL = { w: 130, h: 128, gap: 10, x: 372, y: 206 };

function tabRect(index) {
  const total = TABS.length * TAB.w + (TABS.length - 1) * TAB.gap;
  return { x: (W - total) / 2 + index * (TAB.w + TAB.gap), y: TAB.y, w: TAB.w, h: TAB.h };
}

function cardRect(index) {
  const total = ANCHOR_TYPES.length * CARD.w + (ANCHOR_TYPES.length - 1) * CARD.gap;
  return { x: (W - total) / 2 + index * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
}

function tileRect(index) {
  const total = 3 * TILE.w + 2 * TILE.gapX;
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: (W - total) / 2 + col * (TILE.w + TILE.gapX), y: TILE.y + row * (TILE.h + TILE.gapY), w: TILE.w, h: TILE.h };
}

function medalRect(index) {
  const col = index % 6;
  const row = Math.floor(index / 6);
  return { x: MEDAL.x + col * (MEDAL.w + MEDAL.gap), y: MEDAL.y + row * (MEDAL.h + MEDAL.gap), w: MEDAL.w, h: MEDAL.h };
}

/** Planks, grain and nails: a wooden jetty to stand everything on. */
function paintWood() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const plankHeight = 90;
  for (let row = 0; row * plankHeight < H; row += 1) {
    const shade = row % 2 ? '#4a3019' : '#3d2714';
    const plank = g.createLinearGradient(0, row * plankHeight, 0, (row + 1) * plankHeight);
    plank.addColorStop(0, shade);
    plank.addColorStop(1, '#2a1a0c');
    g.fillStyle = plank;
    g.fillRect(0, row * plankHeight, W, plankHeight);
    g.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, (row + 1) * plankHeight);
    g.lineTo(W, (row + 1) * plankHeight);
    g.stroke();
    g.strokeStyle = 'rgba(255, 220, 160, 0.06)';
    g.lineWidth = 2;
    for (let line = 0; line < 5; line += 1) {
      const y = row * plankHeight + 14 + line * 16;
      g.beginPath();
      g.moveTo(0, y + (row * 7 + line * 5) % 6);
      for (let x = 0; x <= W; x += 80) g.lineTo(x, y + Math.sin(x * 0.01 + row + line) * 3);
      g.stroke();
    }
    g.fillStyle = 'rgba(0, 0, 0, 0.45)';
    for (const x of [30, W - 30]) {
      g.beginPath();
      g.arc(x, row * plankHeight + 20, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
  const shade = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);
  return canvas;
}

export class DockScene {
  enter(game, data = {}) {
    this.progress = game.progress;
    this.wood = paintWood();
    this.elapsed = 0;
    this.tab = data.tab || 'anchors';
    this.hover = -1;
    this.hoverTab = -1;
    this.hoverBack = false;
    this.message = '';
    this.messageTimer = 0;
  }

  say(message) {
    this.message = message;
    this.messageTimer = 2.2;
  }

  setTab(id, game) {
    if (this.tab === id) return;
    this.tab = id;
    this.hover = -1;
    game.audio.play('click');
  }

  activateAnchor(index, game) {
    const type = ANCHOR_TYPES[index];
    const { progress } = this;
    if (!type) return;
    if (progress.isUnlocked(type.id)) {
      if (progress.selected === type.id) return;
      progress.equip(type.id);
      game.audio.play('select');
      this.say(`${type.name} equipped`);
      return;
    }
    const result = progress.buy(type.id);
    if (result === '') {
      game.audio.play('unlock');
      this.say(`${type.name} unlocked and equipped!`);
    } else {
      game.audio.play('deny');
      this.say(`Not enough salvage: ${type.cost - progress.salvage} more to go`);
    }
  }

  activateTalent(index, game) {
    const talent = TALENTS[index];
    if (!talent) return;
    const { progress } = this;
    const result = progress.buyTalent(talent.id);
    if (result === '') {
      game.audio.play('unlock');
      this.say(`${talent.name} is now level ${progress.talentLevel(talent.id)}`);
    } else if (result === 'maxed') {
      game.audio.play('deny');
      this.say(`${talent.name} is fully learned`);
    } else {
      game.audio.play('deny');
      this.say(`Not enough salvage: ${progress.talentCost(talent.id) - progress.salvage} more to go`);
    }
  }

  update(dt, game) {
    const { input } = game;
    this.elapsed += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    const mx = input.mouse.x;
    const my = input.mouse.y;
    this.hover = -1;
    const rects = this.tab === 'anchors' ? ANCHOR_TYPES.map((_, i) => cardRect(i))
      : this.tab === 'workshop' ? TALENTS.map((_, i) => tileRect(i))
        : MEDALS.map((_, i) => medalRect(i));
    rects.forEach((rect, index) => {
      if (inRect(mx, my, rect)) this.hover = index;
    });
    this.hoverTab = -1;
    TABS.forEach((_, index) => {
      if (inRect(mx, my, tabRect(index))) this.hoverTab = index;
    });
    this.hoverBack = inRect(mx, my, BACK_BUTTON);

    if (input.wasPressed('KeyM')) game.audio.toggleMute();
    if (this.elapsed < 0.25) return;

    const index = TABS.findIndex((tab) => tab.id === this.tab);
    if (input.anyPressed('KeyE', 'ArrowRight')) this.setTab(TABS[(index + 1) % TABS.length].id, game);
    else if (input.anyPressed('KeyQ', 'ArrowLeft')) this.setTab(TABS[(index + TABS.length - 1) % TABS.length].id, game);
    if (input.mouse.pressed && this.hoverTab >= 0) this.setTab(TABS[this.hoverTab].id, game);

    if (this.tab === 'anchors') {
      ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((code, i) => {
        if (input.wasPressed(code)) this.activateAnchor(i, game);
      });
      if (input.mouse.pressed && this.hover >= 0) this.activateAnchor(this.hover, game);
    } else if (this.tab === 'workshop') {
      ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].forEach((code, i) => {
        if (input.wasPressed(code)) this.activateTalent(i, game);
      });
      if (input.mouse.pressed && this.hover >= 0) this.activateTalent(this.hover, game);
    }
    if (input.anyPressed('Escape', 'Enter') || (input.mouse.pressed && this.hoverBack)) {
      game.audio.play('click');
      game.switchTo('title');
    }
  }

  draw(ctx, game) {
    ctx.drawImage(this.wood, 0, 0);
    const t = game.clock;
    text(ctx, 'THE DOCK', W / 2, 70, {
      size: 56, align: 'center', font: FONT_TITLE, weight: 'normal', color: PALETTE.gold, stroke: '#2a1a05', strokeWidth: 11,
      shadow: { color: 'rgba(0,0,0,0.5)', dx: 0, dy: 5 },
    });
    text(ctx, 'Salvage from every voyage buys anchors and permanent talents.', W / 2, 98, {
      size: 18, align: 'center', color: PALETTE.cream, stroke: '#2a1a05', strokeWidth: 5, weight: 'normal',
    });

    drawIcon(ctx, 'crate', W - 150, 50, 40, PALETTE.gold);
    text(ctx, formatScore(this.progress.salvage), W - 40, 60, {
      size: 36, align: 'right', color: '#ffffff', font: FONT_TITLE, weight: 'normal', stroke: '#2a1a05', strokeWidth: 8,
    });
    text(ctx, 'SALVAGE', W - 40, 82, { size: 14, align: 'right', color: PALETTE.pearl });

    this.drawTabs(ctx);
    if (this.tab === 'anchors') ANCHOR_TYPES.forEach((type, index) => this.drawCard(ctx, type, index, t));
    else if (this.tab === 'workshop') TALENTS.forEach((talent, index) => this.drawTile(ctx, talent, index));
    else this.drawLog(ctx);

    button(ctx, BACK_BUTTON, 'BACK', { hover: this.hoverBack, size: 24 });
    keycap(ctx, 'ESC', BACK_BUTTON.x + BACK_BUTTON.w + 16, BACK_BUTTON.y + 34, { size: 14 });
    if (this.messageTimer > 0) {
      text(ctx, this.message, W / 2, 686, { size: 24, align: 'center', color: PALETTE.gold, stroke: '#2a1a05', strokeWidth: 6 });
    }
  }

  drawTabs(ctx) {
    TABS.forEach((tab, index) => {
      const rect = tabRect(index);
      const active = tab.id === this.tab;
      const hovered = this.hoverTab === index;
      panel(ctx, rect.x, rect.y, rect.w, rect.h, {
        fill: active ? 'rgba(255, 200, 61, 0.95)' : 'rgba(18, 11, 5, 0.78)',
        stroke: active ? '#fff1d6' : hovered ? PALETTE.gold : 'rgba(255, 241, 214, 0.35)',
        lineWidth: active ? 4 : 2.5,
        radius: 16,
        shadow: false,
      });
      drawIcon(ctx, tab.icon, rect.x + 30, rect.y + rect.h / 2, 26, active ? '#2a1a05' : PALETTE.cream);
      text(ctx, tab.label, rect.x + 54, rect.y + 30, { size: 19, color: active ? '#2a1a05' : PALETTE.cream });
    });
    keycap(ctx, 'Q', tabRect(0).x - 34, TAB.y + 32, { size: 14 });
    keycap(ctx, 'E', tabRect(TABS.length - 1).x + TAB.w + 14, TAB.y + 32, { size: 14 });
  }

  drawCard(ctx, type, index, time) {
    const rect = cardRect(index);
    const owned = this.progress.isUnlocked(type.id);
    const equipped = this.progress.selected === type.id;
    const affordable = this.progress.salvage >= type.cost;
    const hovered = this.hover === index;
    const accent = equipped ? PALETTE.mint : owned ? PALETTE.cream : affordable ? PALETTE.gold : '#8a7a66';
    const cx = rect.x + rect.w / 2;

    ctx.save();
    ctx.translate(0, hovered ? -8 : 0);
    if (hovered || equipped) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 26;
    }
    panel(ctx, rect.x, rect.y, rect.w, rect.h, { fill: 'rgba(18, 11, 5, 0.82)', stroke: accent, lineWidth: equipped || hovered ? 5 : 3, radius: 22 });
    ctx.shadowBlur = 0;

    keycap(ctx, String(index + 1), rect.x + rect.w - 46, rect.y + 36, { size: 15 });

    const stage = ctx.createRadialGradient(cx, rect.y + 112, 6, cx, rect.y + 112, 84);
    stage.addColorStop(0, 'rgba(255, 220, 160, 0.25)');
    stage.addColorStop(1, 'rgba(255, 220, 160, 0)');
    ctx.fillStyle = stage;
    ctx.beginPath();
    ctx.arc(cx, rect.y + 112, 84, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, rect.y + 112 + Math.sin(time * 2 + index) * 3);
    ctx.rotate(Math.sin(time * 0.9 + index) * 0.35);
    ctx.scale(3.1, 3.1);
    ctx.globalAlpha = owned || affordable ? 1 : 0.55;
    drawAnchorShape(ctx, type.id, time);
    ctx.restore();

    text(ctx, type.name, cx, rect.y + 222, { size: 28, align: 'center' });
    wrap(ctx, type.blurb, rect.w - 40, 17).slice(0, 3).forEach((line, row) => {
      text(ctx, line, cx, rect.y + 250 + row * 21, { size: 17, align: 'center', weight: 'normal', color: PALETTE.pearl });
    });

    const stats = anchorStats(type.id);
    const rows = [
      ['DAMAGE', clamp((stats.damage - 0.6) / 1.1, 0.06, 1)],
      ['REACH', clamp((stats.reach - 150) / 180, 0.06, 1)],
      ['SPEED', clamp((stats.speed - 0.7) / 0.8, 0.06, 1)],
    ];
    rows.forEach(([label, value], row) => {
      const y = rect.y + 310 + row * 22;
      text(ctx, label, rect.x + 22, y + 12, { size: 13, color: PALETTE.pearl });
      roundRect(ctx, rect.x + 92, y, 156, 12, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
      roundRect(ctx, rect.x + 92, y, 156 * value, 12, 6);
      ctx.fillStyle = accent;
      ctx.fill();
    });

    const badgeY = rect.y + rect.h - 36;
    roundRect(ctx, rect.x + 22, badgeY - 18, rect.w - 44, 38, 19);
    ctx.fillStyle = equipped ? 'rgba(111, 242, 197, 0.9)' : owned ? 'rgba(255, 241, 214, 0.18)' : affordable ? 'rgba(255, 200, 61, 0.95)' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    const label = equipped ? 'EQUIPPED' : owned ? 'OWNED  •  EQUIP' : `${type.cost} SALVAGE`;
    text(ctx, label, cx, badgeY + 8, {
      size: 18, align: 'center', color: equipped || (affordable && !owned) ? '#2a1a05' : PALETTE.pearl,
    });
    ctx.restore();
  }

  drawTile(ctx, talent, index) {
    const rect = tileRect(index);
    const { progress } = this;
    const level = progress.talentLevel(talent.id);
    const max = maxLevel(talent);
    const cost = progress.talentCost(talent.id);
    const maxed = cost === 0;
    const affordable = !maxed && progress.salvage >= cost;
    const hovered = this.hover === index;
    const accent = maxed ? PALETTE.mint : affordable ? PALETTE.gold : level > 0 ? PALETTE.cream : '#8a7a66';

    ctx.save();
    ctx.translate(0, hovered ? -5 : 0);
    if (hovered) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 22;
    }
    panel(ctx, rect.x, rect.y, rect.w, rect.h, { fill: 'rgba(18, 11, 5, 0.82)', stroke: accent, lineWidth: hovered ? 5 : 3, radius: 20 });
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 220, 160, 0.12)';
    ctx.beginPath();
    ctx.arc(rect.x + 54, rect.y + 62, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawIcon(ctx, talent.icon, rect.x + 54, rect.y + 62, 44, level > 0 || affordable ? '#ffffff' : '#9a8a76');

    text(ctx, talent.name, rect.x + 106, rect.y + 34, { size: 24 });
    keycap(ctx, String(index + 1), rect.x + rect.w - 30, rect.y + 28, { size: 13 });
    wrap(ctx, talent.text, rect.w - 130, 16).slice(0, 2).forEach((line, row) => {
      text(ctx, line, rect.x + 106, rect.y + 60 + row * 20, { size: 16, weight: 'normal', color: PALETTE.pearl });
    });

    for (let i = 0; i < max; i += 1) {
      roundRect(ctx, rect.x + 106 + i * 30, rect.y + 104, 24, 11, 5);
      ctx.fillStyle = i < level ? accent : 'rgba(255,255,255,0.14)';
      ctx.fill();
    }
    const pillX = rect.x + rect.w - 138;
    roundRect(ctx, pillX, rect.y + 94, 118, 30, 15);
    ctx.fillStyle = maxed ? 'rgba(111, 242, 197, 0.9)' : affordable ? 'rgba(255, 200, 61, 0.95)' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    text(ctx, maxed ? 'MASTERED' : `${cost} SALVAGE`, pillX + 59, rect.y + 115, {
      size: 14, align: 'center', color: maxed || affordable ? '#2a1a05' : PALETTE.pearl,
    });
    ctx.restore();
  }

  drawLog(ctx) {
    const { progress } = this;
    const data = progress.data;
    panel(ctx, 50, 178, 300, 440, { fill: 'rgba(18, 11, 5, 0.82)', stroke: PALETTE.cream, lineWidth: 3, radius: 22 });
    text(ctx, 'CAREER', 76, 214, { size: 16, color: PALETTE.gold });
    const lines = [
      ['Voyages sailed', data.runs],
      ['Voyages won', data.wins],
      ['Creatures sunk', formatScore(data.kills)],
      ['Best score', formatScore(data.best)],
      ['Deepest dive', data.bestDive ? `wave ${data.bestDive}` : '–'],
      ['Contracts done', data.contracts],
    ];
    lines.forEach(([label, value], row) => {
      const y = 246 + row * 32;
      text(ctx, label, 76, y, { size: 17, weight: 'normal', color: PALETTE.pearl });
      text(ctx, String(value), 326, y, { size: 19, align: 'right' });
    });
    text(ctx, 'BOSSES DEFEATED', 76, 456, { size: 16, color: PALETTE.gold });
    REGIONS.slice(1).forEach((region, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 76 + col * 140;
      const y = 484 + row * 62;
      const count = progress.bossesDown(region.boss);
      ctx.fillStyle = count > 0 ? 'rgba(111, 242, 197, 0.16)' : 'rgba(255,255,255,0.06)';
      roundRect(ctx, x, y, 128, 52, 12);
      ctx.fill();
      drawBossIcon(ctx, region.boss, x + 26, y + 26, 34, count > 0 ? PALETTE.cream : '#6a5a46', 'rgba(18, 11, 5, 0.8)');
      text(ctx, count > 0 ? `x${count}` : '–', x + 100, y + 33, { size: 20, align: 'center', color: count > 0 ? PALETTE.mint : '#8a7a66' });
    });

    text(ctx, `MEDALS  ${progress.medalCount} / ${MEDALS.length}`, MEDAL.x, 192, { size: 20, color: PALETTE.gold });
    MEDALS.forEach((medal, index) => {
      const rect = medalRect(index);
      const earned = progress.hasMedal(medal.id);
      const hovered = this.hover === index;
      ctx.save();
      ctx.translate(0, hovered ? -4 : 0);
      panel(ctx, rect.x, rect.y, rect.w, rect.h, {
        fill: earned ? 'rgba(60, 40, 12, 0.88)' : 'rgba(18, 11, 5, 0.72)',
        stroke: earned ? PALETTE.gold : hovered ? PALETTE.cream : 'rgba(255, 241, 214, 0.25)',
        lineWidth: earned || hovered ? 3.5 : 2, radius: 16, shadow: false,
      });
      ctx.beginPath();
      ctx.arc(rect.x + rect.w / 2, rect.y + 44, 28, 0, Math.PI * 2);
      ctx.fillStyle = earned ? 'rgba(255, 200, 61, 0.22)' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      drawIcon(ctx, earned ? medal.icon : 'lock', rect.x + rect.w / 2, rect.y + 44, 34, earned ? PALETTE.gold : '#6a5a46');
      wrap(ctx, medal.name, rect.w - 14, 14).slice(0, 2).forEach((line, row) => {
        text(ctx, line, rect.x + rect.w / 2, rect.y + 92 + row * 17, { size: 14, align: 'center', color: earned ? PALETTE.cream : '#8a7a66' });
      });
      ctx.restore();
    });
    const focus = MEDALS[this.hover];
    if (focus) {
      text(ctx, `${focus.name}: ${focus.text}`, W / 2 + 120, 650, { size: 19, align: 'center', color: PALETTE.cream, stroke: '#2a1a05', strokeWidth: 5, weight: 'normal' });
    } else {
      text(ctx, 'Hover a medal to see how to earn it.', W / 2 + 120, 650, { size: 18, align: 'center', color: PALETTE.pearl, weight: 'normal', stroke: '#2a1a05', strokeWidth: 5 });
    }
  }
}
