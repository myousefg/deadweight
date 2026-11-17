// The dock: spend the salvage you bank at the end of every run on anchors that play differently.
// Click a card to buy it (or equip one you own). What you own and wear is saved between visits.

import { W, H, PALETTE, FONT_TITLE } from '../config.js';
import { clamp, formatScore } from '../math.js';
import { ANCHOR_TYPES, anchorStats } from '../anchor-types.js';
import { drawAnchorShape } from '../render/anchor-shapes.js';
import { drawIcon } from '../render/icons.js';
import { text, panel, button, inRect, roundRect, wrap, keycap } from '../render/ui.js';

const CARD = { w: 270, h: 456, gap: 24, y: 146 };
const BACK_BUTTON = { x: 44, y: 646, w: 210, h: 56 };

function cardRect(index) {
  const total = ANCHOR_TYPES.length * CARD.w + (ANCHOR_TYPES.length - 1) * CARD.gap;
  return { x: (W - total) / 2 + index * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
}

/** Planks, grain and nails: a wooden jetty to stand the anchors on. */
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
  enter(game) {
    this.progress = game.progress;
    this.wood = paintWood();
    this.elapsed = 0;
    this.hover = -1;
    this.hoverBack = false;
    this.message = '';
    this.messageTimer = 0;
  }

  say(message) {
    this.message = message;
    this.messageTimer = 2.2;
  }

  activate(index, game) {
    const type = ANCHOR_TYPES[index];
    const { progress } = this;
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

  update(dt, game) {
    const { input } = game;
    this.elapsed += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    const mx = input.mouse.x;
    const my = input.mouse.y;
    this.hover = -1;
    ANCHOR_TYPES.forEach((_, index) => {
      if (inRect(mx, my, cardRect(index))) this.hover = index;
    });
    this.hoverBack = inRect(mx, my, BACK_BUTTON);

    if (input.wasPressed('KeyM')) game.audio.toggleMute();
    if (this.elapsed < 0.25) return;
    ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((code, index) => {
      if (input.wasPressed(code)) this.activate(index, game);
    });
    if (input.mouse.pressed && this.hover >= 0) this.activate(this.hover, game);
    if (input.anyPressed('Escape', 'KeyT', 'Enter') || (input.mouse.pressed && this.hoverBack)) {
      game.audio.play('click');
      game.switchTo('title');
    }
  }

  draw(ctx, game) {
    ctx.drawImage(this.wood, 0, 0);
    const t = game.clock;
    text(ctx, 'THE DOCK', W / 2, 88, {
      size: 70, align: 'center', font: FONT_TITLE, weight: 'normal', color: PALETTE.gold, stroke: '#2a1a05', strokeWidth: 12,
      shadow: { color: 'rgba(0,0,0,0.5)', dx: 0, dy: 6 },
    });
    text(ctx, 'Spend salvage on anchors that change how you play. Runs earn salvage.', W / 2, 126, {
      size: 22, align: 'center', color: PALETTE.cream, stroke: '#2a1a05', strokeWidth: 6, weight: 'normal',
    });

    drawIcon(ctx, 'crate', W - 150, 56, 44, PALETTE.gold);
    text(ctx, formatScore(this.progress.salvage), W - 40, 68, {
      size: 40, align: 'right', color: '#ffffff', font: FONT_TITLE, weight: 'normal', stroke: '#2a1a05', strokeWidth: 8,
    });
    text(ctx, 'SALVAGE', W - 40, 92, { size: 15, align: 'right', color: PALETTE.pearl });

    ANCHOR_TYPES.forEach((type, index) => this.drawCard(ctx, type, index, t));
    button(ctx, BACK_BUTTON, 'BACK', { hover: this.hoverBack, size: 26 });
    keycap(ctx, 'ESC', BACK_BUTTON.x + BACK_BUTTON.w + 16, BACK_BUTTON.y + 36, { size: 15 });
    if (this.messageTimer > 0) {
      text(ctx, this.message, W / 2, 636, { size: 24, align: 'center', color: PALETTE.gold, stroke: '#2a1a05', strokeWidth: 6 });
    }
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

    const stage = ctx.createRadialGradient(cx, rect.y + 120, 6, cx, rect.y + 120, 86);
    stage.addColorStop(0, 'rgba(255, 220, 160, 0.25)');
    stage.addColorStop(1, 'rgba(255, 220, 160, 0)');
    ctx.fillStyle = stage;
    ctx.beginPath();
    ctx.arc(cx, rect.y + 120, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, rect.y + 120 + Math.sin(time * 2 + index) * 3);
    ctx.rotate(Math.sin(time * 0.9 + index) * 0.35);
    ctx.scale(3.1, 3.1);
    ctx.globalAlpha = owned || affordable ? 1 : 0.55;
    drawAnchorShape(ctx, type.id, time);
    ctx.restore();

    text(ctx, type.name, cx, rect.y + 230, { size: 28, align: 'center' });
    wrap(ctx, type.blurb, rect.w - 40, 17).slice(0, 3).forEach((line, row) => {
      text(ctx, line, cx, rect.y + 258 + row * 21, { size: 17, align: 'center', weight: 'normal', color: PALETTE.pearl });
    });

    const stats = anchorStats(type.id);
    const rows = [
      ['DAMAGE', clamp((stats.damage - 0.6) / 1.1, 0.06, 1)],
      ['REACH', clamp((stats.reach - 150) / 180, 0.06, 1)],
      ['SPEED', clamp((stats.speed - 0.7) / 0.8, 0.06, 1)],
    ];
    rows.forEach(([label, value], row) => {
      const y = rect.y + 326 + row * 22;
      text(ctx, label, rect.x + 22, y + 12, { size: 13, color: PALETTE.pearl });
      roundRect(ctx, rect.x + 92, y, 156, 12, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
      roundRect(ctx, rect.x + 92, y, 156 * value, 12, 6);
      ctx.fillStyle = accent;
      ctx.fill();
    });

    const badgeY = rect.y + rect.h - 40;
    roundRect(ctx, rect.x + 22, badgeY - 18, rect.w - 44, 38, 19);
    ctx.fillStyle = equipped ? 'rgba(111, 242, 197, 0.9)' : owned ? 'rgba(255, 241, 214, 0.18)' : affordable ? 'rgba(255, 200, 61, 0.95)' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    const label = equipped ? 'EQUIPPED' : owned ? 'OWNED  •  EQUIP' : `${type.cost} SALVAGE`;
    text(ctx, label, cx, badgeY + 8, {
      size: 18, align: 'center', color: equipped || (affordable && !owned) ? '#2a1a05' : PALETTE.pearl,
    });
    ctx.restore();
  }
}
