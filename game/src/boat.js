// The player's rowboat: acceleration-based sailing, a short dash, hit points and invulnerability
// frames. It never draws itself; render/boat-art.js does that.

import { BOAT, W, H, PALETTE } from './config.js';
import { audio } from './audio.js';
import { turnToward } from './math.js';

export class Boat {
  constructor(maxHp = BOAT.hp) {
    this.x = W / 2;
    this.y = H * 0.62;
    this.vx = 0;
    this.vy = 0;
    this.r = BOAT.radius;
    this.heading = -Math.PI / 2;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.invuln = 0;
    this.dashTimer = 0;
    this.dashCd = 0;
    this.dashX = 0;
    this.dashY = -1;
    this.oar = 0;
    this.wakeTimer = 0;
    this.sinking = false;
    this.sinkTime = 0;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  update(dt, controls, build, world) {
    if (this.sinking) {
      this.sinkTime += dt;
      this.vx *= Math.exp(-3 * dt);
      this.vy *= Math.exp(-3 * dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.heading += dt * 2.4;
      if (Math.random() < 0.5) world.particles.bubble(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 20, 3 + Math.random() * 4);
      return;
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    const maxSpeed = BOAT.maxSpeed * build.speed;

    let wantX = controls.moveX;
    let wantY = controls.moveY;
    const wantLength = Math.hypot(wantX, wantY);
    if (wantLength > 1) {
      wantX /= wantLength;
      wantY /= wantLength;
    }

    if (controls.dash && this.dashCd <= 0 && this.dashTimer <= 0) {
      // Dash where the keys point, or straight ahead when no key is held.
      const aimX = wantLength > 0 ? wantX : Math.cos(this.heading);
      const aimY = wantLength > 0 ? wantY : Math.sin(this.heading);
      const norm = Math.hypot(aimX, aimY) || 1;
      this.dashX = aimX / norm;
      this.dashY = aimY / norm;
      this.dashTimer = BOAT.dashTime;
      this.dashCd = BOAT.dashCooldown * build.dashCooldown;
      this.invuln = Math.max(this.invuln, BOAT.dashTime + 0.12);
      audio.play('dash');
      world.particles.splash(this.x, this.y, 10, PALETTE.foam, 260);
      world.particles.ring(this.x, this.y, 12, 70, 0.35, PALETTE.foam, 3);
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashX * BOAT.dashSpeed;
      this.vy = this.dashY * BOAT.dashSpeed;
      if (Math.random() < 0.8) world.particles.foam(this.x - this.dashX * 20, this.y - this.dashY * 20, 12, 0.6);
    } else {
      const targetX = wantX * maxSpeed;
      const targetY = wantY * maxSpeed;
      let ax = targetX - this.vx;
      let ay = targetY - this.vy;
      const gap = Math.hypot(ax, ay);
      const step = BOAT.accel * dt;
      if (gap > step) {
        ax = (ax / gap) * step;
        ay = (ay / gap) * step;
      }
      this.vx += ax;
      this.vy += ay;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const margin = BOAT.margin;
    if (this.x < margin) { this.x = margin; this.vx = Math.max(0, this.vx); }
    if (this.x > W - margin) { this.x = W - margin; this.vx = Math.min(0, this.vx); }
    if (this.y < margin + 40) { this.y = margin + 40; this.vy = Math.max(0, this.vy); }
    if (this.y > H - margin) { this.y = H - margin; this.vy = Math.min(0, this.vy); }

    const speed = this.speed;
    if (speed > 25) this.heading = turnToward(this.heading, Math.atan2(this.vy, this.vx), 9 * dt);
    this.oar += speed * dt * 0.045 + dt * 1.2;

    this.wakeTimer -= dt;
    if (speed > 60 && this.wakeTimer <= 0) {
      this.wakeTimer = 0.06;
      world.particles.foam(this.x - Math.cos(this.heading) * 22, this.y - Math.sin(this.heading) * 22, 6 + speed * 0.02, 0.6);
    }
  }

  /** Heal up to the cap; returns the amount actually healed. */
  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }
}
