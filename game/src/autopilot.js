// A simple computer pilot. It drives the title-screen demo, stages the screenshot scenes and lets
// the whole game be played through for testing. It sweeps the anchor through the nearest enemy,
// keeps its distance, sidesteps spines and red circles, and uses slam, dash and surge sensibly.

import { W, H } from './config.js';
import { clamp } from './math.js';

export function createAutopilot({ home = { x: W / 2, y: H * 0.58 }, homePull = 1.6 } = {}) {
  let clock = 0;

  return function steer(world, dt) {
    clock += dt;
    const { boat, anchor, build } = world;
    const reach = anchor.reach(build);

    let target = null;
    let nearest = Infinity;
    for (const enemy of world.enemies) {
      const gap = Math.hypot(enemy.x - boat.x, enemy.y - boat.y) - enemy.r;
      if (gap < nearest) {
        nearest = gap;
        target = enemy;
      }
    }

    let aimX;
    let aimY;
    if (target && nearest < reach + 120) {
      const angle = clock * 11;
      aimX = target.x + Math.cos(angle) * (target.r + 26);
      aimY = target.y + Math.sin(angle) * (target.r + 26);
    } else {
      const angle = clock * 5.2;
      aimX = boat.x + Math.cos(angle) * reach * 0.85;
      aimY = boat.y + Math.sin(angle) * reach * 0.85;
    }

    let moveX = 0;
    let moveY = 0;
    if (target) {
      const dx = boat.x - target.x;
      const dy = boat.y - target.y;
      const gap = Math.hypot(dx, dy) || 1;
      const wanted = target.def.contact > 1 || target.boss ? 250 : 175;
      const push = clamp((wanted - gap) / wanted, -0.6, 1);
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
      if (hazard.struck) continue;
      const dx = boat.x - hazard.x;
      const dy = boat.y - hazard.y;
      const gap = Math.hypot(dx, dy) || 1;
      if (gap < hazard.r + 90) {
        moveX += (dx / gap) * 3;
        moveY += (dy / gap) * 3;
      }
    }
    for (const enemy of world.enemies) {
      if (!enemy.state || (enemy.state !== 'dash' && enemy.state !== 'charge')) continue;
      const dx = boat.x - enemy.x;
      const dy = boat.y - enemy.y;
      const gap = Math.hypot(dx, dy) || 1;
      if (gap < 230) {
        const side = dx * enemy.vy - dy * enemy.vx > 0 ? 1 : -1;
        moveX += (-enemy.vy / 600) * side * 2.6;
        moveY += (enemy.vx / 600) * side * 2.6;
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
    if (target && anchor.slamCd <= 0 && nearest < reach * 0.8 && world.enemies.length >= 2) {
      const anchorGap = Math.hypot(target.x - anchor.x, target.y - anchor.y);
      if (anchorGap < 150) {
        slam = true;
        aimX = target.x;
        aimY = target.y;
      }
    }
    const surge = world.tide >= 1 && (world.enemies.length >= 5 || boat.hp <= 2);
    const dash = target !== null && nearest < 60 && boat.dashCd <= 0;

    return { moveX, moveY, aimX, aimY, slam, surge, dash };
  };
}
