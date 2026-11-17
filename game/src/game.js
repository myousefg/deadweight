// The game shell: owns the canvas, input, the current scene and the fixed-step clock, and keeps
// the best score. Scenes ask it to switch, to start a new run, or to save a score.

import { W, H, STEP, MAX_STEPS_PER_FRAME } from './config.js';
import { Input } from './input.js';
import { audio } from './audio.js';
import { World } from './world.js';
import { TitleScene } from './scenes/title.js';
import { PlayScene } from './scenes/play.js';
import { HarborScene } from './scenes/harbor.js';
import { GameOverScene } from './scenes/gameover.js';
import { VictoryScene } from './scenes/victory.js';

const BEST_KEY = 'deadweight-best-score';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = audio;
    this.scenes = {
      title: new TitleScene(),
      play: new PlayScene(),
      harbor: new HarborScene(),
      gameover: new GameOverScene(),
      victory: new VictoryScene(),
    };
    this.current = null;
    this.currentName = '';
    this.run = null;
    this.best = this.loadBest();
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

  loadBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  /** Remember a new best score; returns true when it beat the old one. */
  saveBest(score) {
    if (score <= this.best) return false;
    this.best = score;
    try {
      localStorage.setItem(BEST_KEY, String(Math.round(score)));
    } catch {
      // Private browsing or blocked storage: the best score just lasts for this page view.
    }
    return true;
  }

  switchTo(name, data) {
    this.current?.exit?.(this);
    this.current = this.scenes[name];
    this.currentName = name;
    this.canvas.style.cursor = name === 'play' ? 'none' : 'default';
    this.current.enter(this, data);
    this.fade = 1;
  }

  newRun(seed = Date.now() % 100000) {
    const world = new World({ seed });
    world.startWave(1);
    this.run = { world, seed };
    return world;
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
