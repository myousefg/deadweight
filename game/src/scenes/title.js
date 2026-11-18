// The title screen, a career hub: the real game plays itself on the right (an autopilot swings the
// anchor through drifting creatures) while the left explains the controls, shows the captain's
// career as badges that light up with progress, and offers the voyage, the endless Deep Dive or
// the dock. A small card up in the corner shows the equipped anchor and the salvage in the hold.

import { W, H, PALETTE, FONT_TITLE } from '../core/config.js';
import { World } from '../sim/world.js';
import { createAutopilot } from '../tools/autopilot.js';
import { anchorType } from '../data/anchor-types.js';
import { drawAnchorShape } from '../render/anchor-shapes.js';
import { drawAnchorRow, drawBossRow, drawMedalRows, drawWorkshopRow } from '../render/career-badges.js';
import { drawIcon } from '../render/icons.js';
import { text, title, panel, button, inRect, keycap, measure } from '../render/ui.js';
import { clamp, formatScore } from '../core/math.js';

const START_BUTTON = { x: 50, y: 616, w: 270, h: 70 };
const DIVE_BUTTON = { x: 334, y: 616, w: 210, h: 70 };
const DOCK_BUTTON = { x: 558, y: 616, w: 200, h: 70 };
const CONTROLS = [
  ['WASD', 'Row the boat'],
  ['MOUSE', 'Swing the anchor'],
  ['CLICK', 'Slam: an area blow'],
  ['SHIFT', 'Dash through danger'],
  ['SPACE', 'Tide Surge'],
];
/** The career panel: how to play on the left, the captain's badges right of the divider. */
const HUB = { x: 50, y: 250, w: 710, h: 344 };
const DIVIDER_X = 372;
const CAPTAIN_X = 400;

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
    world.boat.x = clamp(world.boat.x, 690, W - 90);
    world.boat.y = clamp(world.boat.y, 220, H - 90);
  }

  /** A creature arriving from the top, right or bottom edge of the open half. */
  spawnDemoCreature(world) {
    const { rng } = world;
    const side = rng.int(0, 2);
    let x = rng.range(700, W);
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

    this.drawHub(ctx, game);

    button(ctx, START_BUTTON, 'SET SAIL', { primary: true, hover: this.hover === 'start', size: 32 });
    button(ctx, DIVE_BUTTON, 'DEEP DIVE', { hover: this.hover === 'dive', size: 25 });
    button(ctx, DOCK_BUTTON, 'THE DOCK', { hover: this.hover === 'dock', size: 25 });
    text(ctx, 'ENTER: voyage   X: endless dive   D: dock', START_BUTTON.x + 4, DOCK_BUTTON.y + DOCK_BUTTON.h + 22, {
      size: 16, color: PALETTE.foam, weight: 'normal', stroke: 'rgba(2,22,32,0.8)', strokeWidth: 4,
    });

    this.drawCaptain(ctx, game);

    if (game.best > 0) {
      text(ctx, `BEST  ${formatScore(game.best)}`, W - 36, H - 30, {
        size: 26, align: 'right', color: PALETTE.gold, font: FONT_TITLE, weight: 'normal', stroke: '#10222d', strokeWidth: 6,
      });
    }
    if (game.progress.data.bestDive > 0) {
      text(ctx, `DEEP DIVE RECORD  wave ${game.progress.data.bestDive}`, W - 36, H - 62, {
        size: 18, align: 'right', color: PALETTE.foam, stroke: '#10222d', strokeWidth: 5,
      });
    }
    const muteLabel = game.audio.muted ? 'SOUND OFF  (M)' : 'SOUND ON  (M)';
    const width = measure(ctx, muteLabel, 14);
    text(ctx, muteLabel, W - 20 - width, 30, { size: 14, color: 'rgba(234,252,247,0.8)', stroke: 'rgba(2,22,32,0.8)', strokeWidth: 3 });
  }

  /** The career hub: HOW TO PLAY, a divider, then YOUR CAPTAIN with badge rows that light up. */
  drawHub(ctx, game) {
    const { x, y, w, h } = HUB;
    panel(ctx, x, y, w, h, { radius: 22, fill: 'rgba(4, 35, 47, 0.84)' });

    text(ctx, 'HOW TO PLAY', x + 30, y + 40, { size: 21, color: PALETTE.gold });
    CONTROLS.forEach(([key, label], index) => {
      const rowY = y + 86 + index * 41;
      const width = keycap(ctx, key, x + 30, rowY, { size: 17 });
      text(ctx, label, x + 30 + Math.max(width, 86) + 14, rowY, { size: 18, weight: 'normal', color: PALETTE.cream });
    });
    text(ctx, 'The faster the anchor moves,', x + 30, y + 280, { size: 16, weight: 'normal', color: PALETTE.steel });
    text(ctx, 'the harder it hits: TAP, WHAM, CRUSH.', x + 30, y + 300, { size: 16, weight: 'normal', color: PALETTE.steel });

    ctx.save();
    ctx.strokeStyle = 'rgba(234, 252, 247, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(DIVIDER_X, y + 22);
    ctx.lineTo(DIVIDER_X, y + h - 22);
    ctx.stroke();
    ctx.restore();

    text(ctx, 'YOUR CAPTAIN', CAPTAIN_X, y + 40, { size: 21, color: PALETTE.gold });
    drawWorkshopRow(ctx, game, CAPTAIN_X, y + 68);
    drawMedalRows(ctx, game, CAPTAIN_X, y + 148);
    drawBossRow(ctx, game, CAPTAIN_X, y + 230);
    drawAnchorRow(ctx, game, CAPTAIN_X + 176, y + 230);

    const { counts } = game.content;
    text(ctx, `${counts.regions} regions · ${counts.bosses} bosses · ${counts.creatures} creatures · ${counts.upgrades} upgrades · ${counts.talents} talents · ${counts.medals} medals`, x + w / 2, y + h - 13, {
      size: 15, align: 'center', color: PALETTE.mint,
    });
  }

  /** The corner card: the equipped anchor and the salvage waiting in the hold. */
  drawCaptain(ctx, game) {
    const { progress } = game;
    const type = anchorType(progress.selected);
    const x = W - 292;
    const y = 36;
    panel(ctx, x, y, 262, 78, { radius: 18, fill: 'rgba(4, 35, 47, 0.82)', shadow: false });
    ctx.save();
    ctx.translate(x + 38, y + 40 + Math.sin(game.clock * 2) * 2);
    ctx.rotate(Math.sin(game.clock) * 0.3);
    ctx.scale(1.0, 1.0);
    drawAnchorShape(ctx, type.id, game.clock);
    ctx.restore();
    text(ctx, type.name, x + 78, y + 34, { size: 21 });
    drawIcon(ctx, 'crate', x + 90, y + 56, 18, PALETTE.gold);
    text(ctx, `SALVAGE  ${formatScore(progress.salvage)}`, x + 106, y + 62, { size: 16, color: PALETTE.gold });
  }
}
