// The game shell: owns the canvas, input, the current scene and the fixed-step clock, and keeps
// the saved progress. Scenes ask it to switch, to start a new run, or to bank a finished run.

import { W, H, STEP, MAX_STEPS_PER_FRAME } from './config.js';
import { Input } from './input.js';
import { audio } from './audio.js';
import { World } from './world.js';
import { Progress } from './progress.js';
import { awardMedals } from './medals.js';
import { TitleScene } from './scenes/title.js';
import { DockScene } from './scenes/dock.js';
import { ChartScene } from './scenes/chart.js';
import { PlayScene } from './scenes/play.js';
import { HarborScene } from './scenes/harbor.js';
import { GameOverScene } from './scenes/gameover.js';
import { VictoryScene } from './scenes/victory.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = audio;
    this.progress = new Progress();
    this.scenes = {
      title: new TitleScene(),
      dock: new DockScene(),
      chart: new ChartScene(),
      play: new PlayScene(),
      harbor: new HarborScene(),
      gameover: new GameOverScene(),
      victory: new VictoryScene(),
    };
    this.current = null;
    this.currentName = '';
    this.run = null;
    /** True when the next run is a Deep Dive (endless) rather than the twelve-wave voyage. */
    this.endless = false;
    this.fade = 0;
    this.clock = 0;
    /** Canvas pixels per logical pixel; main.js sets it when the window is fitted. */
    this.pixelRatio = 1;
    this.accumulator = 0;
    this.lastTime = 0;
    /** When set, the play scene takes its controls from this function instead of the keyboard. */
    this.controlOverride = null;
    /** When true the clock stops updating but the scene keeps drawing (used to capture a frame). */
    this.frozen = false;

    const unlock = () => this.audio.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    const pauseOnLeave = () => {
      if (!this.frozen) this.current?.onBlur?.(this);
    };
    window.addEventListener('blur', pauseOnLeave);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseOnLeave();
    });
  }

  get best() {
    return this.progress.best;
  }

  switchTo(name, data) {
    this.current?.exit?.(this);
    this.current = this.scenes[name];
    this.currentName = name;
    this.canvas.style.cursor = name === 'play' ? 'none' : 'default';
    this.current.enter(this, data);
    this.fade = 1;
  }

  /** Start a run with whichever anchor is equipped. The sea chart then starts its first wave. */
  newRun(seed = Date.now() % 100000, endless = this.endless) {
    this.endless = !!endless;
    const world = new World({ seed, anchorKind: this.progress.selected, talents: this.progress.data.talents, endless: this.endless });
    this.run = { world, seed, newBest: false, salvage: 0, medals: [] };
    return world;
  }

  /** Bank a finished run: best score and salvage. Called once, when a run ends. */
  finishRun(world, won) {
    if (this.run.banked) return;
    this.run.banked = true;
    this.run.newBest = this.progress.recordBest(world.stats.score, world.endless, world.wave);
    if (world.endless) this.progress.recordBest(world.stats.score);
    this.run.salvage = this.progress.recordRun(world.stats, won);
    this.run.medals = awardMedals(this.progress, world, won);
    if (this.run.medals.length) this.audio.play('medal');
  }

  /** Browser animation frame: run as many fixed steps as the elapsed time asks for, then draw. */
  frame(now) {
    const elapsed = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    if (!this.frozen) {
      this.accumulator += elapsed;
      let steps = 0;
      while (this.accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
        this.update(STEP);
        this.accumulator -= STEP;
        steps += 1;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    }
    this.draw();
  }

  update(dt) {
    this.clock += dt;
    this.fade = Math.max(0, this.fade - dt * 3.2);
    this.current.update(dt, this);
    this.input.endStep();
  }

  draw() {
    const { ctx } = this;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, W, H);
    this.current.draw(ctx, this);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(2, 18, 28, ${this.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /** Advance the simulation without drawing: used by tests and to stage screenshots. */
  advance(seconds) {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) this.update(STEP);
  }
}
