// The title screen: the real game plays itself on the right (an autopilot swings the anchor
// through drifting jellies) while the left explains the controls and offers Set Sail.

import { W, H, PALETTE, FONT_TITLE } from '../config.js';
import { World } from '../world.js';
import { createAutopilot } from '../autopilot.js';
import { text, title, panel, button, inRect, keycap, measure } from '../render/ui.js';
import { clamp, formatScore } from '../math.js';

const START_BUTTON = { x: 70, y: 616, w: 330, h: 70 };
const CONTROLS = [
  ['WASD', 'Row the boat'],
  ['MOUSE', 'Swing the heavy anchor. Speed is damage'],
  ['CLICK', 'Slam the anchor down: a crushing area blow'],
  ['SHIFT', 'Dash through danger'],
  ['SPACE', 'Tide Surge: charge it with kills and pearls'],
];

export class TitleScene {
  enter(game) {
    const world = new World({ seed: 11, attract: true });
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
    this.hover = false;
  }

  start(game) {
    game.audio.unlock();
    game.audio.play('select');
    game.newRun();
    game.switchTo('play');
  }

  update(dt, game) {
    const { input, audio } = game;
    const world = this.world;
    this.hover = inRect(input.mouse.x, input.mouse.y, START_BUTTON);
    if (input.wasPressed('KeyM')) audio.toggleMute();
    if (input.anyPressed('Enter', 'Space') || (input.mouse.pressed && this.hover)) {
      this.start(game);
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

    panel(ctx, 50, 262, 700, 326, { radius: 22, fill: 'rgba(4, 35, 47, 0.8)' });
    text(ctx, 'HOW TO PLAY', 80, 304, { size: 20, color: PALETTE.gold });
    CONTROLS.forEach(([key, label], index) => {
      const y = 348 + index * 44;
      const width = keycap(ctx, key, 80, y, { size: 18 });
      text(ctx, label, 80 + Math.max(width, 92) + 18, y, { size: 19, weight: 'normal', color: PALETTE.pearl });
    });
    text(ctx, 'Sink 8 waves of sea creatures, then face the Kraken.', 80, 570, {
      size: 18, color: PALETTE.mint, weight: 'normal',
    });

    button(ctx, START_BUTTON, 'SET SAIL', { primary: true, hover: this.hover, size: 34, hint: '' });
    text(ctx, 'or press ENTER', START_BUTTON.x + START_BUTTON.w + 24, START_BUTTON.y + 42, {
      size: 18, color: PALETTE.pearl, weight: 'normal', stroke: 'rgba(2,22,32,0.8)', strokeWidth: 4,
    });

    if (game.best > 0) {
      text(ctx, `BEST  ${formatScore(game.best)}`, W - 36, H - 30, {
        size: 24, align: 'right', color: PALETTE.gold, font: FONT_TITLE, weight: 'normal', stroke: '#10222d', strokeWidth: 6,
      });
    }
    const muteLabel = game.audio.muted ? 'SOUND OFF  (M)' : 'SOUND ON  (M)';
    const width = measure(ctx, muteLabel, 14);
    text(ctx, muteLabel, W - 20 - width, 30, { size: 14, color: 'rgba(234,252,247,0.8)', stroke: 'rgba(2,22,32,0.8)', strokeWidth: 3 });
  }
}
