// "The sea is calm": the Kraken is down. Golden rays, confetti, the run's numbers and an
// instant restart.

import { W, H, PALETTE } from '../config.js';
import { TAU } from '../math.js';
import { drawResultsPanel } from '../render/results-panel.js';
import { text, title, button, inRect, keycap } from '../render/ui.js';

const AGAIN_BUTTON = { x: W / 2 - 350, y: 556, w: 330, h: 70 };
const TITLE_BUTTON = { x: W / 2 + 20, y: 556, w: 330, h: 70 };

export class VictoryScene {
  enter(game) {
    this.world = game.run.world;
    this.newBest = !!game.run.newBest;
    this.elapsed = 0;
    this.hover = '';
    this.confettiTimer = 0;
  }

  restart(game) {
    game.audio.play('select');
    game.newRun();
    game.switchTo('play');
  }

  update(dt, game) {
    const { input } = game;
    const { world } = this;
    this.elapsed += dt;
    world.time += dt;
    world.particles.update(dt);
    world.effects.update(dt);
    this.confettiTimer -= dt;
    if (this.confettiTimer <= 0) {
      this.confettiTimer = 0.9;
      world.particles.confetti(Math.random() * W, -20, 14);
    }

    this.hover = '';
    if (inRect(input.mouse.x, input.mouse.y, AGAIN_BUTTON)) this.hover = 'again';
    else if (inRect(input.mouse.x, input.mouse.y, TITLE_BUTTON)) this.hover = 'title';
    if (input.wasPressed('KeyM')) game.audio.toggleMute();
    if (this.elapsed < 0.6) return;
    if (input.anyPressed('Enter', 'Space') || (input.mouse.pressed && this.hover === 'again')) this.restart(game);
    else if (input.wasPressed('KeyT') || (input.mouse.pressed && this.hover === 'title')) game.switchTo('title');
  }

  draw(ctx, game) {
    const { world } = this;
    world.draw(ctx);
    ctx.fillStyle = 'rgba(2, 24, 36, 0.62)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, 150);
    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * TAU + this.elapsed * 0.12;
      ctx.fillStyle = 'rgba(255, 220, 120, 0.1)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 900, angle, angle + 0.11);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const slide = Math.min(1, this.elapsed / 0.5);
    ctx.save();
    ctx.globalAlpha = slide;
    title(ctx, 'THE SEA IS CALM', W / 2, 150, 112, PALETTE.gold);
    text(ctx, 'The Kraken sinks beneath the waves. You are the legend of this harbor.', W / 2, 196, {
      size: 24, align: 'center', color: PALETTE.cream, stroke: '#10222d', strokeWidth: 6,
    });
    drawResultsPanel(ctx, world, W / 2 - 440, 238, 880, { won: true, newBest: this.newBest, best: game.best });
    button(ctx, AGAIN_BUTTON, 'SAIL AGAIN', { primary: true, hover: this.hover === 'again', size: 32 });
    button(ctx, TITLE_BUTTON, 'TITLE', { hover: this.hover === 'title', size: 32 });
    keycap(ctx, 'ENTER', AGAIN_BUTTON.x + AGAIN_BUTTON.w / 2 - 32, AGAIN_BUTTON.y + AGAIN_BUTTON.h + 26, { size: 14 });
    keycap(ctx, 'T', TITLE_BUTTON.x + TITLE_BUTTON.w / 2 - 8, TITLE_BUTTON.y + TITLE_BUTTON.h + 26, { size: 14 });
    text(ctx, 'Thanks for sailing Deadweight.', W / 2, H - 18, { size: 17, align: 'center', weight: 'normal', color: PALETTE.pearl });
    ctx.restore();
  }
}
