// The title screen: the real game plays itself on the right (an autopilot swings the anchor
// through drifting creatures) while the left explains the controls, shows the captain's career at a
// glance (workshop talents, medals, bosses beaten, anchors owned) and offers the voyage, the
// endless Deep Dive, or the dock.

import { W, H, PALETTE, FONT_TITLE } from '../core/config.js';
import { World } from '../sim/world.js';
import { createAutopilot } from '../tools/autopilot.js';
import { anchorType } from '../data/anchor-types.js';
import { totalLevels } from '../data/talents.js';
import { drawAnchorShape } from '../render/anchor-shapes.js';
import { drawIcon } from '../render/icons.js';
import { drawBossIcon } from '../render/chart-art.js';
import { text, title, panel, button, inRect, keycap, measure } from '../render/ui.js';
import { clamp, formatScore } from '../core/math.js';

const START_BUTTON = { x: 50, y: 616, w: 270, h: 70 };
const DIVE_BUTTON = { x: 334, y: 616, w: 210, h: 70 };
const DOCK_BUTTON = { x: 558, y: 616, w: 200, h: 70 };
const PANEL = { x: 50, y: 262, w: 710, h: 326 };
const CAREER_X = 418;
const CONTROLS = [
  ['WASD', 'Row the boat'],
  ['MOUSE', 'Swing the anchor'],
  ['CLICK', 'Slam it down'],
  ['SHIFT', 'Dash'],
  ['SPACE', 'Tide Surge'],
];

export class TitleScene {
  enter(game) {
    const world = new World({ seed: 11, attract: true, anchorKind: game.progress.selected });
    world.godMode = true;
    // An inert state: the wave director never runs, so nothing clears or ends in the demo.
    world.state = 'attract';
    world.boat.x = 930;
    world.boat.y = 470;
    world.anchor.x = 990;
    world.anchor.y = 540;
    this.world = world;
    this.pilot = createAutopilot({ home: { x: 930, y: 450 }, homePull: 5 });
    this.spawnTimer = 0.2;
    this.hover = '';
  }

  start(game, endless = false) {
    game.audio.unlock();
    game.audio.play('select');
    game.newRun(undefined, endless);
    game.switchTo('chart');
  }

  update(dt, game) {
    const { input, audio } = game;
    const world = this.world;
    this.hover = '';
    const { x: mx, y: my } = input.mouse;
    if (inRect(mx, my, START_BUTTON)) this.hover = 'start';
    else if (inRect(mx, my, DIVE_BUTTON)) this.hover = 'dive';
    else if (inRect(mx, my, DOCK_BUTTON)) this.hover = 'dock';
    if (input.wasPressed('KeyM')) audio.toggleMute();
    if (input.wasPressed('KeyD') || (input.mouse.pressed && this.hover === 'dock')) {
      audio.play('click');
      game.switchTo('dock');
      return;
    }
    if (input.wasPressed('KeyX') || (input.mouse.pressed && this.hover === 'dive')) {
      this.start(game, true);
      return;
    }
    if (input.anyPressed('Enter', 'Space') || (input.mouse.pressed && this.hover === 'start')) {
      this.start(game, false);
      return;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && world.enemies.length < 6) {
      this.spawnTimer = 2.4;
      const pack = world.rng.int(3, 5);
      for (let i = 0; i < pack; i += 1) this.spawnDemoCreature(world);
    }
    world.update(dt, this.pilot(world, dt));
    // The demo stays on the open-sea side of the screen, clear of the controls panel.
    world.boat.x = clamp(world.boat.x, 790, W - 90);
    world.boat.y = clamp(world.boat.y, 220, H - 90);
  }

  /** A creature arriving from the top, right or bottom edge of the open half. */
  spawnDemoCreature(world) {
    const { rng } = world;
    const side = rng.int(0, 2);
    let x = rng.range(800, W);
    let y = -46;
    if (side === 1) {
      x = W + 46;
      y = rng.range(160, H);
    } else if (side === 2) {
      y = H + 46;
    }
    const kind = rng.weighted([
      { value: 'jelly', weight: 5 },
      { value: 'piranha', weight: 2.5 },
      { value: 'urchin', weight: 1.4 },
      { value: 'puffer', weight: 1 },
      { value: 'manta', weight: 0.7 },
    ]);
    world.spawnEnemy(kind, x, y);
  }

  draw(ctx, game) {
    const world = this.world;
    world.draw(ctx);

    const shade = ctx.createLinearGradient(0, 0, W, 0);
    shade.addColorStop(0, 'rgba(2, 24, 36, 0.78)');
    shade.addColorStop(0.5, 'rgba(2, 24, 36, 0.35)');
    shade.addColorStop(1, 'rgba(2, 24, 36, 0)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);

    const bob = Math.sin(game.clock * 1.6) * 5;
    title(ctx, 'DEADWEIGHT', 400, 168 + bob, 138, PALETTE.gold, { align: 'center' });
    text(ctx, 'Swing the anchor. Sink the sea.', 400, 222, {
      size: 30, align: 'center', color: PALETTE.cream, stroke: '#10222d', strokeWidth: 7,
    });

    panel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, { radius: 22, fill: 'rgba(4, 35, 47, 0.84)' });
    this.drawControls(ctx);
    ctx.strokeStyle = 'rgba(234, 252, 247, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CAREER_X - 16, PANEL.y + 22);
    ctx.lineTo(CAREER_X - 16, PANEL.y + PANEL.h - 62);
    ctx.stroke();
    this.drawCareer(ctx, game);
    const { counts } = game.content;
    text(ctx, `${counts.regions} regions · ${counts.bosses} bosses · ${counts.creatures} creatures · ${counts.upgrades} upgrades · ${counts.contracts} contracts`, PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 22, {
      size: 20, align: 'center', color: PALETTE.mint,
    });

    button(ctx, START_BUTTON, 'SET SAIL', { primary: true, hover: this.hover === 'start', size: 32 });
    button(ctx, DIVE_BUTTON, 'DEEP DIVE', { hover: this.hover === 'dive', size: 25 });
    button(ctx, DOCK_BUTTON, 'THE DOCK', { hover: this.hover === 'dock', size: 25 });
    text(ctx, 'ENTER: voyage   X: endless dive   D: dock', START_BUTTON.x + 4, DOCK_BUTTON.y + DOCK_BUTTON.h + 22, {
      size: 16, color: PALETTE.pearl, weight: 'normal', stroke: 'rgba(2,22,32,0.8)', strokeWidth: 4,
    });

    this.drawCaptain(ctx, game);

    if (game.best > 0) {
      text(ctx, `BEST  ${formatScore(game.best)}`, W - 36, H - 30, {
        size: 26, align: 'right', color: PALETTE.gold, font: FONT_TITLE, weight: 'normal', stroke: '#10222d', strokeWidth: 6,
      });
    }
    if (game.progress.data.bestDive > 0) {
      text(ctx, `DEEP DIVE RECORD  wave ${game.progress.data.bestDive}`, W - 36, H - 62, {
        size: 18, align: 'right', color: PALETTE.pearl, stroke: '#10222d', strokeWidth: 5,
      });
    }
    const muteLabel = game.audio.muted ? 'SOUND OFF  (M)' : 'SOUND ON  (M)';
    const width = measure(ctx, muteLabel, 14);
    text(ctx, muteLabel, W - 20 - width, 30, { size: 14, color: 'rgba(234,252,247,0.8)', stroke: 'rgba(2,22,32,0.8)', strokeWidth: 3 });
  }

  /** The left half of the panel: the five controls. */
  drawControls(ctx) {
    text(ctx, 'HOW TO PLAY', PANEL.x + 30, PANEL.y + 40, { size: 21, color: PALETTE.gold });
    CONTROLS.forEach(([key, label], index) => {
      const y = PANEL.y + 86 + index * 42;
      const width = keycap(ctx, key, PANEL.x + 30, y, { size: 19 });
      text(ctx, label, PANEL.x + 30 + Math.max(width, 96) + 14, y, { size: 21, weight: 'normal', color: PALETTE.pearl });
    });
  }

  /**
   * The right half: the captain's career as four rows of badges that light up as they are earned.
   * Workshop talents (with level pips), medals, bosses beaten and anchors owned.
   */
  drawCareer(ctx, game) {
    const { progress, content } = game;
    const gold = PALETTE.gold;
    const dim = 'rgba(255, 255, 255, 0.07)';
    const dimLine = 'rgba(234, 252, 247, 0.28)';
    text(ctx, 'YOUR CAPTAIN', CAREER_X, PANEL.y + 40, { size: 21, color: gold });

    // Workshop talents.
    text(ctx, `WORKSHOP  ${progress.talentTotal}/${totalLevels()}`, CAREER_X, PANEL.y + 70, { size: 15, color: PALETTE.pearl });
    content.talents.forEach((talent, index) => {
      const cx = CAREER_X + 16 + index * 36;
      const cy = PANEL.y + 94;
      const level = progress.talentLevel(talent.id);
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fillStyle = level > 0 ? 'rgba(255, 200, 61, 0.2)' : dim;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = level > 0 ? gold : dimLine;
      ctx.stroke();
      drawIcon(ctx, talent.icon, cx, cy, 20, level > 0 ? '#ffffff' : 'rgba(234, 252, 247, 0.45)');
      for (let pip = 0; pip < talent.costs.length; pip += 1) {
        ctx.beginPath();
        ctx.arc(cx + (pip - (talent.costs.length - 1) / 2) * 7, cy + 24, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = pip < level ? gold : 'rgba(255, 255, 255, 0.22)';
        ctx.fill();
      }
    });

    // Medals: two rows of nine.
    text(ctx, `MEDALS  ${progress.medalCount}/${content.medals.length}`, CAREER_X, PANEL.y + 150, { size: 15, color: PALETTE.pearl });
    content.medals.forEach((medal, index) => {
      const cx = CAREER_X + 16 + (index % 9) * 36;
      const cy = PANEL.y + 174 + Math.floor(index / 9) * 30;
      const earned = progress.hasMedal(medal.id);
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = earned ? 'rgba(255, 200, 61, 0.28)' : dim;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = earned ? gold : dimLine;
      ctx.stroke();
      if (earned) drawIcon(ctx, medal.icon, cx, cy, 15, gold);
    });

    // Bosses beaten and anchors owned.
    const beaten = content.regions.filter((region) => progress.bossesDown(region.boss) > 0).length;
    text(ctx, `BOSSES  ${beaten}/${content.regions.length}`, CAREER_X, PANEL.y + 240, { size: 15, color: PALETTE.pearl });
    content.regions.forEach((region, index) => {
      const cx = CAREER_X + 18 + index * 40;
      const cy = PANEL.y + 268;
      const down = progress.bossesDown(region.boss) > 0;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = down ? 'rgba(111, 242, 197, 0.16)' : dim;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = down ? PALETTE.mint : dimLine;
      ctx.stroke();
      drawBossIcon(ctx, region.boss, cx, cy, 28, down ? PALETTE.cream : 'rgba(234, 252, 247, 0.4)', 'rgba(4, 35, 47, 0.8)');
    });
    const anchorX = CAREER_X + 176;
    text(ctx, `ANCHORS  ${progress.owned}/${content.anchors.length}`, anchorX, PANEL.y + 240, { size: 15, color: PALETTE.pearl });
    content.anchors.forEach((type, index) => {
      const cx = anchorX + 18 + index * 38;
      const cy = PANEL.y + 268;
      const owned = progress.isUnlocked(type.id);
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = owned ? 'rgba(180, 196, 207, 0.18)' : dim;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = owned ? PALETTE.cream : dimLine;
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(0.62, 0.62);
      ctx.globalAlpha = owned ? 1 : 0.35;
      drawAnchorShape(ctx, type.id, game.clock);
      ctx.restore();
    });
  }

  /** The equipped anchor and the salvage in the hold, tucked in the top corner. */
  drawCaptain(ctx, game) {
    const { progress } = game;
    const type = anchorType(progress.selected);
    const x = W - 352;
    const y = 46;
    panel(ctx, x, y, 332, 80, { radius: 18, fill: 'rgba(4, 35, 47, 0.82)', shadow: false });
    ctx.save();
    ctx.translate(x + 40, y + 40 + Math.sin(game.clock * 2) * 2);
    ctx.rotate(Math.sin(game.clock) * 0.3);
    ctx.scale(1.1, 1.1);
    drawAnchorShape(ctx, type.id, game.clock);
    ctx.restore();
    text(ctx, type.name, x + 80, y + 34, { size: 21 });
    text(ctx, `SALVAGE  ${formatScore(progress.salvage)}`, x + 80, y + 60, { size: 16, color: PALETTE.gold });
  }
}
