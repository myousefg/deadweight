// The title screen: the real game plays itself on the right (an autopilot swings the anchor
// through drifting creatures) while the left explains the controls and offers the voyage, the
// endless Deep Dive, or the dock. A small captain's card shows the career so far.

import { W, H, PALETTE, FONT_TITLE } from '../config.js';
import { World } from '../world.js';
import { createAutopilot } from '../autopilot.js';
import { anchorType, ANCHOR_TYPES } from '../anchor-types.js';
import { MEDALS } from '../medals.js';
import { totalLevels } from '../talents.js';
import { drawAnchorShape } from '../render/anchor-shapes.js';
import { drawIcon } from '../render/icons.js';
import { text, title, panel, button, inRect, keycap, measure } from '../render/ui.js';
import { clamp, formatScore } from '../math.js';

const START_BUTTON = { x: 50, y: 616, w: 270, h: 70 };
const DIVE_BUTTON = { x: 334, y: 616, w: 210, h: 70 };
const DOCK_BUTTON = { x: 558, y: 616, w: 200, h: 70 };
const CONTROLS = [
  ['WASD', 'Row the boat'],
  ['MOUSE', 'Swing the heavy anchor. Speed is damage'],
  ['CLICK', 'Slam the anchor down: a crushing area blow'],
  ['SHIFT', 'Dash through danger'],
  ['SPACE', 'Tide Surge: charge it with kills and pearls'],
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

    panel(ctx, 50, 262, 710, 326, { radius: 22, fill: 'rgba(4, 35, 47, 0.82)' });
    text(ctx, 'HOW TO PLAY', 80, 302, { size: 21, color: PALETTE.gold });
    CONTROLS.forEach(([key, label], index) => {
      const y = 346 + index * 42;
      const width = keycap(ctx, key, 80, y, { size: 19 });
      text(ctx, label, 80 + Math.max(width, 96) + 18, y, { size: 21, weight: 'normal', color: PALETTE.pearl });
    });
    text(ctx, '4 regions · 4 bosses · 17 upgrades · 9 talents · 18 medals', 80, 566, {
      size: 21, color: PALETTE.mint,
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

  /** The captain's card: the equipped anchor, the salvage in the hold and the career at a glance. */
  drawCaptain(ctx, game) {
    const { progress } = game;
    const type = anchorType(progress.selected);
    const x = W - 352;
    const y = 46;
    panel(ctx, x, y, 332, 132, { radius: 18, fill: 'rgba(4, 35, 47, 0.82)', shadow: false });
    ctx.save();
    ctx.translate(x + 40, y + 38 + Math.sin(game.clock * 2) * 2);
    ctx.rotate(Math.sin(game.clock) * 0.3);
    ctx.scale(1.1, 1.1);
    drawAnchorShape(ctx, type.id, game.clock);
    ctx.restore();
    text(ctx, type.name, x + 80, y + 32, { size: 21 });
    text(ctx, `SALVAGE  ${formatScore(progress.salvage)}`, x + 80, y + 58, { size: 16, color: PALETTE.gold });

    const chips = [
      ['medal', `${progress.medalCount}/${MEDALS.length}`, 'MEDALS'],
      ['chain', `${progress.talentTotal}/${totalLevels()}`, 'TALENTS'],
      ['anchor', `${progress.owned}/${ANCHOR_TYPES.length}`, 'ANCHORS'],
    ];
    chips.forEach(([icon, value, label], index) => {
      const cx = x + 18 + index * 104;
      panel(ctx, cx, y + 76, 96, 44, { radius: 12, fill: 'rgba(255, 255, 255, 0.07)', stroke: null, shadow: false });
      drawIcon(ctx, icon, cx + 18, y + 98, 22, PALETTE.cream);
      text(ctx, value, cx + 36, y + 98, { size: 17 });
      text(ctx, label, cx + 36, y + 113, { size: 10, color: PALETTE.pearl });
    });
  }
}
