// The anchor: a heavy body on a chain. A soft spring pulls it toward the cursor, the chain keeps it
// within reach of the boat, and a click makes it lunge for a slam. Its speed decides how hard it
// hits (see HIT_TIERS), so momentum is the weapon.

import { ANCHOR, HIT_TIERS } from './config.js';
import { audio } from './audio.js';
import { angleDiff, clamp } from './math.js';

export class Anchor {
  constructor(boat) {
    this.x = boat.x + 60;
    this.y = boat.y + 70;
    this.vx = 0;
    this.vy = 0;
    this.r = ANCHOR.radius;
    this.angle = 0;
    this.trail = [];
    this.slamCd = 0;
    this.lunge = 0;
    this.lungeX = 0;
    this.lungeY = 0;
    this.sag = 0;
    this.tier = 0;
    this.speed = 0;
    this.pendingImpact = false;
  }

  /** Chain length for this build. */
  reach(build) {
    return ANCHOR.rope + build.rope;
  }

  /** Which HIT_TIERS entry (1-3) the current speed earns, or 0 when too slow to hurt. */
  tierForSpeed(speed) {
    let tier = 0;
    for (let i = 0; i < HIT_TIERS.length; i += 1) {
      if (speed >= HIT_TIERS[i].min) tier = i + 1;
    }
    return tier;
  }

  update(dt, boat, controls, build, world) {
    this.pendingImpact = false;
    const reach = this.reach(build);
    this.r = ANCHOR.radius * build.anchorSize;
    this.slamCd = Math.max(0, this.slamCd - dt);

    // The spring aims at the cursor, held inside the chain's reach and outside the boat itself.
    let targetX = controls.aimX;
    let targetY = controls.aimY;
    let aimDx = targetX - boat.x;
    let aimDy = targetY - boat.y;
    const aimLength = Math.hypot(aimDx, aimDy) || 1;
    const clampedLength = clamp(aimLength, 52, reach * 0.97);
    targetX = boat.x + (aimDx / aimLength) * clampedLength;
    targetY = boat.y + (aimDy / aimLength) * clampedLength;

    if (controls.slam && this.slamCd <= 0 && this.lunge <= 0 && !boat.sinking) {
      this.lunge = ANCHOR.slamTime;
      this.slamCd = ANCHOR.slamCooldown * build.slamCooldown;
      this.lungeX = targetX;
      this.lungeY = targetY;
      audio.play('slamStart');
    }

    if (this.lunge > 0) {
      this.lunge -= dt;
      const toX = this.lungeX - this.x;
      const toY = this.lungeY - this.y;
      const gap = Math.hypot(toX, toY);
      if (gap < 24 || this.lunge <= 0) {
        this.lunge = 0;
        this.pendingImpact = true;
        this.vx *= 0.15;
        this.vy *= 0.15;
      } else {
        this.vx = (toX / gap) * ANCHOR.slamSpeed;
        this.vy = (toY / gap) * ANCHOR.slamSpeed;
      }
    } else {
      const spring = ANCHOR.spring * build.spring;
      const damping = ANCHOR.damping * Math.sqrt(build.spring);
      this.vx += (spring * (targetX - this.x) - damping * this.vx) * dt;
      this.vy += (spring * (targetY - this.y) - damping * this.vy) * dt;
    }

    const speedNow = Math.hypot(this.vx, this.vy);
    if (speedNow > ANCHOR.maxSpeed) {
      this.vx *= ANCHOR.maxSpeed / speedNow;
      this.vy *= ANCHOR.maxSpeed / speedNow;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.constrainToChain(boat, reach);

    this.speed = Math.hypot(this.vx, this.vy);
    this.tier = this.tierForSpeed(this.speed);
    if (this.speed > 90) {
      const heading = Math.atan2(this.vy, this.vx) - Math.PI / 2;
      this.angle += angleDiff(this.angle, heading) * Math.min(1, 9 * dt);
    } else {
      this.angle += angleDiff(this.angle, 0) * Math.min(1, 2 * dt);
    }

    this.trail.push({ x: this.x, y: this.y, tier: this.tier });
    if (this.trail.length > 16) this.trail.shift();

    // Chain slack bulges to the side the anchor is swinging away from.
    const offsetX = this.x - boat.x;
    const offsetY = this.y - boat.y;
    const length = Math.hypot(offsetX, offsetY) || 1;
    const slack = Math.max(0, reach - length);
    const side = Math.sign(offsetX * (this.vy - boat.vy) - offsetY * (this.vx - boat.vx)) || 1;
    const wanted = Math.min(46, slack * 0.45) * -side;
    this.sag += (wanted - this.sag) * Math.min(1, 10 * dt);
  }

  /** Keep the anchor within the chain's reach, tugging the boat when the chain snaps taut. */
  constrainToChain(boat, reach) {
    const dx = this.x - boat.x;
    const dy = this.y - boat.y;
    const length = Math.hypot(dx, dy);
    if (length <= reach || length === 0) return;
    const nx = dx / length;
    const ny = dy / length;
    this.x = boat.x + nx * reach;
    this.y = boat.y + ny * reach;
    const relativeX = this.vx - boat.vx;
    const relativeY = this.vy - boat.vy;
    const outward = relativeX * nx + relativeY * ny;
    if (outward > 0) {
      this.vx -= nx * outward;
      this.vy -= ny * outward;
      const tug = Math.min(60, outward * 0.05);
      boat.vx += nx * tug;
      boat.vy += ny * tug;
    }
  }
}
