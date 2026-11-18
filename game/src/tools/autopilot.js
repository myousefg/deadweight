// A simple computer pilot. It drives the title-screen demo, stages the screenshot scenes and lets
// the whole voyage be played through for testing. It sweeps the anchor through the nearest body
// part, keeps its distance, sidesteps spines, red circles and sweeps, dashes through shockwave
// rings, and uses slam, dash and surge sensibly.

import { W, H } from '../core/config.js';
import { clamp } from '../core/math.js';
import { nearestPart } from '../enemies/enemy.js';

export function createAutopilot({ home = { x: W / 2, y: H * 0.58 }, homePull = 1.6 } = {}) {
  let clock = 0;

  return function steer(world, dt) {
    clock += dt;
    const { boat, anchor, build } = world;
    const reach = anchor.reach(build);

    let target = null;
    let targetPart = null;
    let nearest = Infinity;
    for (const enemy of world.enemies) {
      const near = nearestPart(enemy, boat.x, boat.y);
      if (near.gap < nearest) {
        nearest = near.gap;
        target = enemy;
        targetPart = near.part;
      }
    }

    let aimX;
    let aimY;
    if (target && nearest < reach + 120) {
      const angle = clock * 11;
      aimX = targetPart.x + Math.cos(angle) * (targetPart.r + 26);
      aimY = targetPart.y + Math.sin(angle) * (targetPart.r + 26);
    } else {
      const angle = clock * 5.2;
      aimX = boat.x + Math.cos(angle) * reach * 0.85;
      aimY = boat.y + Math.sin(angle) * reach * 0.85;
    }

    let moveX = 0;
    let moveY = 0;
    let dash = false;
    if (target) {
      const dx = boat.x - targetPart.x;
      const dy = boat.y - targetPart.y;
      const gap = Math.hypot(dx, dy) || 1;
      // With only stragglers left the pilot closes in for the kill instead of keeping its distance.
      const wanted = world.hunt ? 40 : target.def.contact > 1 || target.boss ? 190 : 150;
      const push = clamp((wanted - (gap - targetPart.r)) / wanted, -0.6, 1);
      moveX += (dx / gap) * push * 1.5 + (-dy / gap) * 0.5;
      moveY += (dy / gap) * push * 1.5 + (dx / gap) * 0.5;
    }
    for (const projectile of world.projectiles) {
      if (projectile.friendly) continue;
      const dx = boat.x - projectile.x;
      const dy = boat.y - projectile.y;
      const gap = Math.hypot(dx, dy) || 1;
      if (gap < 130) {
        const side = dx * projectile.vy - dy * projectile.vx > 0 ? 1 : -1;
        moveX += (-projectile.vy / 300) * side * (1 - gap / 130) * 2.4;
        moveY += (projectile.vx / 300) * side * (1 - gap / 130) * 2.4;
      }
    }
    for (const hazard of world.hazards) {
      const dx = boat.x - hazard.x;
      const dy = boat.y - hazard.y;
      const gap = Math.hypot(dx, dy) || 1;
      if (hazard.kind === 'ring') {
        // Dash through a shockwave as it reaches the boat: dashing is invulnerable.
        if (Math.abs(gap - hazard.r) < 70 && boat.dashCd <= 0) dash = true;
        continue;
      }
      if (hazard.struck) continue;
      if (gap < hazard.r + 90) {
        moveX += (dx / gap) * 3;
        moveY += (dy / gap) * 3;
      }
    }
    for (const enemy of world.enemies) {
      if (enemy.id === 'admiral' && enemy.state === 'lanes') {
        // Slip out past the bow or stern: the cannon lanes only cover the ship's own length.
        const cos = Math.cos(enemy.heading);
        const sin = Math.sin(enemy.heading);
        const along = (boat.x - enemy.x) * cos + (boat.y - enemy.y) * sin;
        if (Math.abs(along) < 185) {
          const away = along >= 0 ? 1 : -1;
          moveX += cos * away * 3.4;
          moveY += sin * away * 3.4;
        }
        continue;
      }
      if (enemy.state === 'telegraph' && enemy.sweep) {
        // Stay out of the red band the eel is about to sweep through.
        const across = enemy.sweep.horizontal ? boat.y - enemy.sweep.y : boat.x - enemy.sweep.x;
        if (Math.abs(across) < 110) {
          const away = across >= 0 ? 1 : -1;
          if (enemy.sweep.horizontal) moveY += away * 3;
          else moveX += away * 3;
        }
        continue;
      }
      if (enemy.state !== 'dash' && enemy.state !== 'charge' && enemy.state !== 'sweep') continue;
      const dx = boat.x - enemy.x;
      const dy = boat.y - enemy.y;
      const gap = Math.hypot(dx, dy) || 1;
      if (gap < 230) {
        const side = dx * enemy.vy - dy * enemy.vx > 0 ? 1 : -1;
        moveX += (-enemy.vy / 600) * side * 2.6;
        moveY += (enemy.vx / 600) * side * 2.6;
      }
    }
    for (const zone of world.zones) {
      if (zone.kind !== 'whirl') continue;
      const dx = boat.x - zone.x;
      const dy = boat.y - zone.y;
      const gap = Math.hypot(dx, dy) || 1;
      if (gap < zone.r * 0.75) {
        moveX += (dx / gap) * 3;
        moveY += (dy / gap) * 3;
      }
    }
    for (const mine of world.mines) {
      const dx = boat.x - mine.x;
      const dy = boat.y - mine.y;
      const gap = Math.hypot(dx, dy) || 1;
      if (gap < 130) {
        moveX += (dx / gap) * 3 * (1 - gap / 130);
        moveY += (dy / gap) * 3 * (1 - gap / 130);
      }
    }
    moveX += ((home.x - boat.x) / W) * homePull;
    moveY += ((home.y - boat.y) / H) * homePull;
    const length = Math.hypot(moveX, moveY);
    if (length > 1) {
      moveX /= length;
      moveY /= length;
    }

    let slam = false;
    if (target && anchor.slamCd <= 0 && nearest < reach * 0.8 && (world.enemies.length >= 2 || target.boss)) {
      const anchorGap = Math.hypot(targetPart.x - anchor.x, targetPart.y - anchor.y);
      if (anchorGap < 150) {
        slam = true;
        aimX = targetPart.x;
        aimY = targetPart.y;
      }
    }
    const surge = world.tide >= 1 && (world.enemies.length >= 5 || boat.hp <= 2 || (target && target.boss));
    if (target !== null && nearest < 40 && boat.dashCd <= 0) dash = true;

    return { moveX, moveY, aimX, aimY, slam, surge, dash: dash && boat.dashCd <= 0 };
  };
}
