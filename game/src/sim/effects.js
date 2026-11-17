// Screen-level feedback: camera shake, hit-stop freezes, damage flash and floating text popups.

import { PALETTE } from '../core/config.js';

export class Effects {
  constructor() {
    this.shake = 0;
    this.hitStop = 0;
    this.hurt = 0;
    this.flash = 0;
    this.popups = [];
    this.clock = 0;
  }

  clear() {
    this.shake = 0;
    this.hitStop = 0;
    this.hurt = 0;
    this.flash = 0;
    this.popups.length = 0;
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  /** Freeze the simulation briefly so a heavy blow lands with weight. */
  stop(seconds) {
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  popup(text, x, y, options = {}) {
    this.popups.push({
      text, x, y,
      color: options.color || PALETTE.cream,
      size: options.size || 22,
      life: options.life || 0.9,
      max: options.life || 0.9,
      rise: options.rise || 46,
      stroke: options.stroke || '#06202b',
    });
  }

  /** Real-time update (it keeps running through hit-stop). */
  update(dt) {
    this.clock += dt;
    this.shake *= Math.exp(-9 * dt);
    if (this.shake < 0.15) this.shake = 0;
    this.hurt = Math.max(0, this.hurt - dt * 1.4);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    for (let i = this.popups.length - 1; i >= 0; i -= 1) {
      const popup = this.popups[i];
      popup.life -= dt;
      if (popup.life <= 0) this.popups.splice(i, 1);
    }
  }

  shakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    return {
      x: Math.sin(this.clock * 83) * this.shake,
      y: Math.cos(this.clock * 71) * this.shake,
    };
  }
}
