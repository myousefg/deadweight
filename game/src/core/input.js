// Keyboard and mouse state. Edge flags (pressed this step) are cleared after every simulation
// step, so one click can never be seen by two steps or two scenes.

import { W, H } from './config.js';

const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter', 'Escape', 'KeyP', 'KeyM', 'KeyR',
  'Digit1', 'Digit2', 'Digit3', 'KeyT',
]);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: W / 2, y: H / 2, down: false, pressed: false, rightPressed: false, moved: false };
    this.attach();
  }

  attach() {
    const canvas = this.canvas;
    window.addEventListener('keydown', (event) => {
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.down.delete(event.code));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouse.down = false;
    });
    canvas.addEventListener('pointermove', (event) => this.track(event));
    canvas.addEventListener('pointerdown', (event) => {
      this.track(event);
      if (event.button === 0) {
        this.mouse.down = true;
        this.mouse.pressed = true;
      } else if (event.button === 2) {
        this.mouse.rightPressed = true;
      }
      try {
        canvas.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic or expired pointers cannot be captured; the game works without capture.
      }
    });
    canvas.addEventListener('pointerup', (event) => {
      if (event.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  /** Convert a pointer event to logical (1280 by 720) canvas coordinates. */
  track(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * W;
    this.mouse.y = ((event.clientY - rect.top) / rect.height) * H;
    this.mouse.moved = true;
  }

  isDown(code) {
    return this.down.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  /** True when any of the given key codes went down this step. */
  anyPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  /** Called by the game after each simulation step. */
  endStep() {
    this.pressed.clear();
    this.mouse.pressed = false;
    this.mouse.rightPressed = false;
  }

  /** The player's intent this step, in the shape the world consumes. */
  readControls() {
    let moveX = 0;
    let moveY = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) moveX -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) moveX += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) moveY -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) moveY += 1;
    return {
      moveX,
      moveY,
      aimX: this.mouse.x,
      aimY: this.mouse.y,
      slam: this.mouse.pressed,
      surge: this.wasPressed('Space') || this.mouse.rightPressed,
      dash: this.wasPressed('ShiftLeft') || this.wasPressed('ShiftRight'),
    };
  }
}
