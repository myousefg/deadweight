// The play scene: feeds the player's controls to the world, draws the HUD, handles pause, and
// hands off to the harbor, the victory screen or the game-over screen when the world says so.

import { W, H, PALETTE } from '../config.js';
import { drawHud, drawReticle } from '../render/hud.js';
import { text, title, panel, keycap } from '../render/ui.js';

const CLEAR_DELAY = 2.6;
const WIN_DELAY = 3.6;
const LOSE_DELAY = 2.4;

export class PlayScene {
  enter(game) {
    this.world = game.run.world;
    this.paused = false;
    this.handedOff = false;
  }

  exit(game) {
    game.audio.setSwing(0);
  }

  /** Switching away from the window pauses a live wave. */
  onBlur() {
    const { state } = this.world;
    if (state === 'intro' || state === 'fight') this.paused = true;
  }

  update(dt, game) {
    const { input, audio } = game;
    const world = this.world;
    if (input.wasPressed('KeyM')) audio.toggleMute();
    if (input.anyPressed('KeyP', 'Escape')) {
      this.paused = !this.paused;
      audio.play('click');
    }
    if (this.paused) {
      if (input.wasPressed('KeyT')) game.switchTo('title');
      audio.setSwing(0);
      return;
    }

    const controls = game.controlOverride ? game.controlOverride(world, dt) : input.readControls();
    world.update(dt, controls);

    if (this.handedOff) return;
    if (world.state === 'cleared' && world.stateTimer > CLEAR_DELAY) {
      this.handedOff = true;
      game.switchTo('harbor');
    } else if (world.state === 'won' && world.stateTimer > WIN_DELAY) {
      this.handedOff = true;
      game.finishRun(world, true);
      game.switchTo('victory');
    } else if (world.state === 'lost' && world.stateTimer > LOSE_DELAY) {
      this.handedOff = true;
      game.finishRun(world, false);
      game.switchTo('gameover');
    }
  }

  draw(ctx, game) {
    const world = this.world;
    world.draw(ctx);
    drawHud(ctx, world, game.best);
    if (world.state !== 'lost' && world.state !== 'won') {
      drawReticle(ctx, game.input.mouse.x, game.input.mouse.y, world.anchor.tier, game.clock);
    }
    if (this.paused) this.drawPause(ctx);
  }

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(2, 18, 28, 0.7)';
    ctx.fillRect(0, 0, W, H);
    title(ctx, 'PAUSED', W / 2, H * 0.4, 110, PALETTE.cream);
    panel(ctx, W / 2 - 250, H * 0.48, 500, 120, { radius: 20 });
    text(ctx, 'The sea will wait.', W / 2, H * 0.48 + 40, { size: 24, align: 'center', color: PALETTE.pearl });
    const keys = [['P', 'resume'], ['T', 'quit to title'], ['M', 'sound']];
    let x = W / 2 - 215;
    keys.forEach(([key, label]) => {
      const width = keycap(ctx, key, x, H * 0.48 + 90, { size: 17 });
      text(ctx, label, x + width + 8, H * 0.48 + 90, { size: 17, weight: 'normal', color: PALETTE.pearl });
      x += width + 20 + label.length * 9;
    });
  }
}
