// The harbor between waves: pick one of three upgrade cards, then optionally spend pearls to
// reroll the cards or mend a life ring, and sail on. Choices here are the run's build.

import { W, H, PALETTE, HARBOR } from '../config.js';
import { TAU, formatScore } from '../math.js';
import { rollChoices, applyUpgrade, levelOf, UPGRADES } from '../upgrades.js';
import { WAVES } from '../waves.js';
import { isBossWave, isRegionStart, regionIndexOf } from '../regions.js';
import { text, title, panel, button, inRect, roundRect, keycap, wrap } from '../render/ui.js';
import { drawIcon } from '../render/icons.js';
import { drawRouteStrip } from '../render/chart-art.js';

const CARD = { w: 300, h: 362, gap: 34, y: 158 };
const REROLL_BUTTON = { x: W / 2 - 372, y: 538, w: 350, h: 56 };
const REPAIR_BUTTON = { x: W / 2 + 22, y: 538, w: 350, h: 56 };
const SAIL_BUTTON = { x: W / 2 - 160, y: 300, w: 320, h: 70 };
const RARITY = {
  common: { color: '#6ff2c5', label: 'COMMON' },
  rare: { color: '#7cc4ff', label: 'RARE' },
  epic: { color: '#ff8fc6', label: 'EPIC' },
};

function cardRect(index) {
  const total = 3 * CARD.w + 2 * CARD.gap;
  return { x: (W - total) / 2 + index * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
}

export class HarborScene {
  enter(game) {
    this.world = game.run.world;
    this.choices = rollChoices(this.world.rng, this.world.build, 3);
    this.elapsed = 0;
    this.picked = -1;
    this.pickTimer = 0;
    this.hover = -1;
    this.hoverButton = '';
    this.message = '';
    this.messageTimer = 0;
    this.world.pickups.length = 0;
    this.world.projectiles.length = 0;
  }

  pick(index, game) {
    const upgrade = this.choices[index];
    if (!upgrade || this.picked >= 0) return;
    this.picked = index;
    applyUpgrade(this.world.build, this.world.boat, upgrade);
    game.audio.play('select');
  }

  say(message) {
    this.message = message;
    this.messageTimer = 1.8;
  }

  reroll(game) {
    const { world } = this;
    if (this.picked >= 0 || this.choices.length === 0) return;
    if (world.purse < HARBOR.rerollCost) {
      game.audio.play('deny');
      this.say(`Rerolling costs ${HARBOR.rerollCost} pearls`);
      return;
    }
    world.purse -= HARBOR.rerollCost;
    this.choices = rollChoices(world.rng, world.build, 3);
    game.audio.play('click');
  }

  repair(game) {
    const { world } = this;
    if (world.boat.hp >= world.boat.maxHp) {
      this.say('Your boat is already in fine shape');
      game.audio.play('deny');
      return;
    }
    if (world.purse < HARBOR.repairCost) {
      game.audio.play('deny');
      this.say(`Repairs cost ${HARBOR.repairCost} pearls`);
      return;
    }
    world.purse -= HARBOR.repairCost;
    world.boat.heal(1);
    game.audio.play('heal');
  }

  sailOn(game) {
    const { world } = this;
    if (world.build.salvage > 0) world.boat.heal(world.build.salvage);
    world.boat.invuln = 1.5;
    const next = world.wave + 1;
    if (isRegionStart(next)) {
      game.switchTo('chart');
    } else {
      world.startWave(next);
      game.switchTo('play');
    }
  }

  update(dt, game) {
    const { input } = game;
    const { world } = this;
    this.elapsed += dt;
    world.time += dt;
    world.particles.update(dt);
    world.effects.update(dt);
    this.messageTimer = Math.max(0, this.messageTimer - dt);

    const mx = input.mouse.x;
    const my = input.mouse.y;
    this.hover = -1;
    this.choices.forEach((_, index) => {
      if (inRect(mx, my, cardRect(index))) this.hover = index;
    });
    this.hoverButton = '';
    if (inRect(mx, my, REROLL_BUTTON)) this.hoverButton = 'reroll';
    else if (inRect(mx, my, REPAIR_BUTTON)) this.hoverButton = 'repair';
    else if (this.choices.length === 0 && inRect(mx, my, SAIL_BUTTON)) this.hoverButton = 'sail';

    if (input.wasPressed('KeyM')) game.audio.toggleMute();
    if (this.elapsed < 0.35) return;

    if (this.picked < 0) {
      ['Digit1', 'Digit2', 'Digit3'].forEach((code, index) => {
        if (input.wasPressed(code)) this.pick(index, game);
      });
      if (input.mouse.pressed) {
        if (this.hover >= 0) this.pick(this.hover, game);
        else if (this.hoverButton === 'reroll') this.reroll(game);
      }
      if (input.wasPressed('KeyR')) this.reroll(game);
      if (this.choices.length === 0 && (input.anyPressed('Enter', 'Space') || (input.mouse.pressed && this.hoverButton === 'sail'))) {
        this.picked = 99;
      }
    }
    if (input.wasPressed('KeyH') || (input.mouse.pressed && this.hoverButton === 'repair')) this.repair(game);

    if (this.picked >= 0) {
      this.pickTimer += dt;
      if (this.pickTimer > 0.85) this.sailOn(game);
    }
  }

  draw(ctx, game) {
    const { world } = this;
    world.draw(ctx);
    ctx.fillStyle = 'rgba(2, 18, 28, 0.76)';
    ctx.fillRect(0, 0, W, H);

    const slide = Math.min(1, this.elapsed / 0.4);
    ctx.save();
    ctx.globalAlpha = slide;
    title(ctx, isBossWave(world.wave) ? 'REGION CLEARED' : `WAVE ${world.wave} CLEARED`, W / 2, 82, 66, PALETTE.mint);
    text(ctx, this.choices.length ? 'Choose a blessing for the next stretch of sea' : 'Every blessing is yours. Sail on.', W / 2, 124, {
      size: 26, align: 'center', color: PALETTE.cream, stroke: '#10222d', strokeWidth: 6,
    });
    drawRouteStrip(ctx, 62, 56, 112, regionIndexOf(world.wave) + (isBossWave(world.wave) ? 1 : 0), game.clock);
    this.drawPurse(ctx, world);

    this.choices.forEach((upgrade, index) => this.drawCard(ctx, upgrade, index));
    if (this.choices.length === 0) button(ctx, SAIL_BUTTON, 'SAIL ON', { primary: true, hover: this.hoverButton === 'sail', size: 34 });

    this.drawShop(ctx, world);
    this.drawBuild(ctx, world);
    this.drawNext(ctx, world);
    ctx.restore();
  }

  drawPurse(ctx, world) {
    const x = W - 34;
    text(ctx, formatScore(world.stats.score), x, 52, {
      size: 36, align: 'right', color: '#ffffff', stroke: 'rgba(2,22,32,0.9)', strokeWidth: 7,
    });
    text(ctx, 'SCORE', x, 74, { size: 14, align: 'right', color: PALETTE.pearl });
    ctx.save();
    ctx.translate(x - 12, 102);
    const glow = ctx.createRadialGradient(-2, -2, 1, 0, 0, 11);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(1, '#e4b8d8');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
    ctx.restore();
    text(ctx, `${world.purse}`, x - 32, 110, { size: 26, align: 'right', stroke: 'rgba(2,22,32,0.9)', strokeWidth: 5 });
    text(ctx, 'PEARLS', x - 32, 128, { size: 12, align: 'right', color: PALETTE.pearl, weight: 'normal' });
  }

  drawCard(ctx, upgrade, index) {
    const rect = cardRect(index);
    const rarity = RARITY[upgrade.rarity];
    const hovered = this.hover === index && this.picked < 0;
    const chosen = this.picked === index;
    const dimmed = this.picked >= 0 && !chosen;
    const entrance = Math.min(1, Math.max(0, (this.elapsed - 0.08 * index) / 0.35));
    const lift = (hovered ? -12 : 0) + (1 - entrance) * 60 - (chosen ? 18 : 0);
    const level = levelOf(this.world.build, upgrade.id);

    ctx.save();
    ctx.globalAlpha = entrance * (dimmed ? 0.3 : 1);
    ctx.translate(0, lift);
    if (hovered || chosen) {
      ctx.shadowColor = rarity.color;
      ctx.shadowBlur = 36;
    }
    panel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill: 'rgba(6, 48, 62, 0.97)', stroke: rarity.color, lineWidth: hovered || chosen ? 5 : 3, radius: 22,
    });
    ctx.shadowBlur = 0;

    text(ctx, rarity.label, rect.x + 22, rect.y + 34, { size: 13, color: rarity.color });
    keycap(ctx, String(index + 1), rect.x + rect.w - 44, rect.y + 38, { size: 15 });

    const cx = rect.x + rect.w / 2;
    const cy = rect.y + 98;
    const halo = ctx.createRadialGradient(cx, cy, 6, cx, cy, 54);
    halo.addColorStop(0, `${rarity.color}55`);
    halo.addColorStop(1, `${rarity.color}00`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rarity.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, TAU);
    ctx.stroke();
    drawIcon(ctx, upgrade.icon, cx, cy, 58, '#ffffff');

    text(ctx, upgrade.name, cx, rect.y + 196, { size: 31, align: 'center' });
    const lines = wrap(ctx, upgrade.text, rect.w - 44, 21);
    lines.slice(0, 3).forEach((line, row) => {
      text(ctx, line, cx, rect.y + 232 + row * 26, { size: 21, align: 'center', weight: 'normal', color: PALETTE.pearl });
    });

    const pipsY = rect.y + rect.h - 30;
    const pipWidth = 22;
    const startX = cx - (upgrade.max * pipWidth) / 2;
    for (let i = 0; i < upgrade.max; i += 1) {
      roundRect(ctx, startX + i * pipWidth + 2, pipsY, pipWidth - 4, 10, 4);
      ctx.fillStyle = i < level ? rarity.color : i === level ? `${rarity.color}aa` : 'rgba(255,255,255,0.14)';
      ctx.fill();
    }
    text(ctx, level === 0 ? 'NEW' : `LEVEL ${level} → ${level + 1}`, cx, pipsY - 10, {
      size: 13, align: 'center', color: rarity.color,
    });
    ctx.restore();
  }

  drawShop(ctx, world) {
    const canReroll = world.purse >= HARBOR.rerollCost && this.choices.length > 0 && this.picked < 0;
    const hurt = world.boat.hp < world.boat.maxHp;
    const canRepair = world.purse >= HARBOR.repairCost && hurt;
    button(ctx, REROLL_BUTTON, `Reroll cards  •  ${HARBOR.rerollCost} pearls`, {
      hover: this.hoverButton === 'reroll', disabled: !canReroll, size: 22,
    });
    button(ctx, REPAIR_BUTTON, hurt ? `Mend a life ring  •  ${HARBOR.repairCost} pearls` : 'Hull in perfect shape', {
      hover: this.hoverButton === 'repair', disabled: !canRepair, size: 22,
    });
    keycap(ctx, 'R', REROLL_BUTTON.x + REROLL_BUTTON.w - 40, REROLL_BUTTON.y + REROLL_BUTTON.h + 24, { size: 14 });
    keycap(ctx, 'H', REPAIR_BUTTON.x + REPAIR_BUTTON.w - 40, REPAIR_BUTTON.y + REPAIR_BUTTON.h + 24, { size: 14 });
    if (this.messageTimer > 0) {
      text(ctx, this.message, W / 2, 634, { size: 22, align: 'center', color: PALETTE.coral, stroke: '#10222d', strokeWidth: 5 });
    }
  }

  drawBuild(ctx, world) {
    const owned = UPGRADES.filter((upgrade) => levelOf(world.build, upgrade.id) > 0);
    text(ctx, 'YOUR BUILD', 44, 652, { size: 14, color: PALETTE.gold });
    if (owned.length === 0) {
      text(ctx, 'Nothing yet. Pick your first blessing.', 44, 682, { size: 17, weight: 'normal', color: PALETTE.pearl });
      return;
    }
    owned.forEach((upgrade, index) => {
      const x = 44 + index * 58;
      const y = 686;
      const rarity = RARITY[upgrade.rarity];
      ctx.strokeStyle = rarity.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(4, 35, 47, 0.9)';
      ctx.beginPath();
      ctx.arc(x + 20, y - 6, 22, 0, TAU);
      ctx.fill();
      ctx.stroke();
      drawIcon(ctx, upgrade.icon, x + 20, y - 6, 28, '#ffffff');
      text(ctx, `x${levelOf(world.build, upgrade.id)}`, x + 36, y + 16, { size: 13, color: rarity.color, stroke: '#06202b', strokeWidth: 3 });
    });
  }

  drawNext(ctx, world) {
    const next = WAVES[world.wave + 1];
    if (!next) return;
    panel(ctx, W - 430, H - 98, 396, 74, { radius: 16, fill: 'rgba(4, 35, 47, 0.85)' });
    text(ctx, `NEXT: WAVE ${world.wave + 1}  —  ${next.name}`, W - 412, H - 66, { size: 17, color: PALETTE.gold });
    const lines = wrap(ctx, next.hint, 360, 15);
    text(ctx, lines[0], W - 412, H - 42, { size: 15, weight: 'normal', color: PALETTE.pearl });
    if (lines[1]) text(ctx, lines[1], W - 412, H - 24, { size: 15, weight: 'normal', color: PALETTE.pearl });
  }
}
