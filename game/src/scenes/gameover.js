// "Lost at sea": the boat has sunk. Shows the run's numbers and offers an instant restart.

import { W, H, PALETTE } from '../config.js';
import { drawResultsPanel } from '../render/results-panel.js';
import { text, title, button, inRect, keycap } from '../render/ui.js';

const AGAIN_BUTTON = { x: W / 2 - 350, y: 556, w: 330, h: 70 };
const TITLE_BUTTON = { x: W / 2 + 20, y: 556, w: 330, h: 70 };
const TIPS = [
  'Faster swings hit harder: whirl the cursor around the boat to build speed.',
  'Sink a shark right after its charge. It is dazed and takes extra damage.',
  'Bat puffer spines and Kraken ink back with a fast swing.',
  'Click to slam the anchor: it clears crowds around the target.',
  'Pearls charge the Tide Surge. Keep the meter ready for emergencies.',
  'Dash gives you a moment of invulnerability. Use it to cross a slam circle.',
];

export class GameOverScene {
  enter(game) {
    this.world = game.run.world;
    this.newBest = !!game.run.newBest;
    this.elapsed = 0;
    this.hover = '';
    this.tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  restart(game) {
    game.audio.play('select');
    game.newRun();
    game.switchTo('chart');
  }

  update(dt, game) {
    const { input } = game;
    const { world } = this;
    this.elapsed += dt;
    world.time += dt;
    world.particles.update(dt);
    world.effects.update(dt);
    if (Math.random() < 0.3) world.particles.bubble(world.boat.x + (Math.random() - 0.5) * 40, world.boat.y, 3 + Math.random() * 4);

    this.hover = '';
    if (inRect(input.mouse.x, input.mouse.y, AGAIN_BUTTON)) this.hover = 'again';
    else if (inRect(input.mouse.x, input.mouse.y, TITLE_BUTTON)) this.hover = 'title';
    if (input.wasPressed('KeyM')) game.audio.toggleMute();
    if (this.elapsed < 0.5) return;
    if (input.anyPressed('Enter', 'Space') || (input.mouse.pressed && this.hover === 'again')) this.restart(game);
    else if (input.wasPressed('KeyT') || (input.mouse.pressed && this.hover === 'title')) game.switchTo('title');
  }

  draw(ctx, game) {
    const { world } = this;
    world.draw(ctx);
    ctx.fillStyle = 'rgba(2, 18, 28, 0.78)';
    ctx.fillRect(0, 0, W, H);
    const slide = Math.min(1, this.elapsed / 0.5);
    ctx.save();
    ctx.globalAlpha = slide;
    title(ctx, 'LOST AT SEA', W / 2, 150, 120, PALETTE.coral);
    text(ctx, 'The anchor drags you under...', W / 2, 196, { size: 26, align: 'center', color: PALETTE.cream, stroke: '#10222d', strokeWidth: 6 });
    drawResultsPanel(ctx, world, W / 2 - 440, 238, 880, { won: false, newBest: this.newBest, best: game.best, salvage: game.run.salvage });
    button(ctx, AGAIN_BUTTON, 'SAIL AGAIN', { primary: true, hover: this.hover === 'again', size: 32 });
    button(ctx, TITLE_BUTTON, 'TITLE', { hover: this.hover === 'title', size: 32 });
    keycap(ctx, 'ENTER', AGAIN_BUTTON.x + AGAIN_BUTTON.w / 2 - 32, AGAIN_BUTTON.y + AGAIN_BUTTON.h + 26, { size: 14 });
    keycap(ctx, 'T', TITLE_BUTTON.x + TITLE_BUTTON.w / 2 - 8, TITLE_BUTTON.y + TITLE_BUTTON.h + 26, { size: 14 });
    text(ctx, `Tip: ${this.tip}`, W / 2, H - 18, { size: 17, align: 'center', weight: 'normal', color: PALETTE.pearl });
    ctx.restore();
  }
}
