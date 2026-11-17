// The Drowned Admiral: the Sunken Fleet's boss, a ghost galleon that never stopped fighting. It
// sails a slow patrol and cycles through four moves:
//   broadside - it turns side-on, red lanes show where the guns point, then a volley of iron balls
//   ram       - a red line warns, it charges, and if it runs aground on a wall it is dazed and wide open
//   crew      - the ghost crew climbs aboard: a pack of snappers and jellies pours over the rails
//   mines     - (second half) it lays a trail of mines behind it
// Mines hurt it badly, so luring a charge across its own minefield is the winning play.

import { W, H, PALETTE } from '../config.js';
import { TAU, easeOutCubic, turnToward, clamp } from '../math.js';
import { audio } from '../audio.js';
import { spawnProjectile } from '../projectiles.js';
import { layMine } from '../mines.js';

const HOME_Y = 200;
const ENTER_TIME = 2.6;
const TURN_TIME = 0.8;
const LANE_TIME = 1.05;
const AIM_TIME = 0.95;
const CHARGE_TIME = 0.85;
const DAZE_TIME = 2.3;
const PORTS = [-105, -35, 35, 105];
const HULL_HALF = 50;
const LANE_REACH = 1000;
const BALL_SPEED = 410;

const PLAN_ONE = ['broadside', 'crew', 'ram', 'broadside'];
const PLAN_TWO = ['broadside', 'mines', 'ram', 'volley', 'crew', 'ram'];

const phaseOf = (e) => (e.hp / e.maxHp > 0.5 ? 1 : 2);

function placeParts(e) {
  const cos = Math.cos(e.heading);
  const sin = Math.sin(e.heading);
  e.parts = [
    { x: e.x, y: e.y, r: 60 },
    { x: e.x + cos * 98, y: e.y + sin * 98, r: 44 },
    { x: e.x - cos * 98, y: e.y - sin * 98, r: 46 },
  ];
}

function later(e, delay, action) {
  e.queue.push({ delay, action });
}

/** One broadside volley: every port on both sides fires, a hair apart. */
function fireVolley(e, world) {
  const cos = Math.cos(e.heading);
  const sin = Math.sin(e.heading);
  PORTS.forEach((offset, index) => {
    later(e, index * 0.09, () => {
      for (const side of [-1, 1]) {
        const nx = -sin * side;
        const ny = cos * side;
        const px = e.x + cos * offset + nx * HULL_HALF;
        const py = e.y + sin * offset + ny * HULL_HALF;
        spawnProjectile(world, {
          x: px, y: py, vx: nx * BALL_SPEED, vy: ny * BALL_SPEED, r: 11, damage: 1, kind: 'ball', life: 4,
        });
        world.particles.splash(px, py, 6, '#cfd8dc', 160);
      }
      audio.play('cannon');
      world.effects.addShake(5);
    });
  });
}

function summonCrew(e, world) {
  audio.play('roar');
  world.effects.popup('ALL HANDS!', e.x, e.y - 100, { color: PALETTE.coral, size: 30, life: 1.2 });
  if (world.enemies.length > 12) return;
  const cos = Math.cos(e.heading);
  const sin = Math.sin(e.heading);
  const count = phaseOf(e) === 1 ? 3 : 4;
  for (let i = 0; i < count; i += 1) {
    const side = i % 2 ? 1 : -1;
    const along = (i - (count - 1) / 2) * 60;
    world.spawnEnemy('piranha', e.x + cos * along - sin * side * 70, e.y + sin * along + cos * side * 70);
  }
  world.spawnEnemy('jelly', e.x - cos * 120, e.y - sin * 120);
}

export const admiral = {
  id: 'admiral',
  name: 'The Drowned Admiral',
  boss: true,
  notches: [0.5],
  radius: 62,
  hp: 150,
  mass: 90,
  contact: 1,
  score: 4000,
  pearls: [0, 0],

  init(e, world) {
    e.hp = world.bossHp(150);
    e.maxHp = e.hp;
    e.x = W / 2;
    e.y = -230;
    e.heading = Math.PI / 2;
    e.state = 'enter';
    e.timer = 0;
    e.queue = [];
    e.step = 0;
    e.waypoint = { x: W / 2, y: HOME_Y };
    e.invulnerable = true;
    e.damageTaken = 0.85;
    e.phaseNo = 1;
    e.dropCd = 0;
    e.dropped = 0;
    placeParts(e);
    audio.play('roar');
    world.effects.addShake(10);
  },

  update(e, world, dt) {
    const boat = world.boat;
    const toBoat = Math.atan2(boat.y - e.y, boat.x - e.x);
    const phase = phaseOf(e);
    e.damageTaken = e.state === 'dazed' ? 1.2 : 0.85;
    e.stun = e.state === 'dazed' ? Math.max(0, e.timer) : 0;

    for (let i = e.queue.length - 1; i >= 0; i -= 1) {
      e.queue[i].delay -= dt;
      if (e.queue[i].delay <= 0) {
        const [item] = e.queue.splice(i, 1);
        item.action();
      }
    }

    if (phase !== e.phaseNo) {
      e.phaseNo = phase;
      audio.play('roar');
      world.effects.addShake(16);
      world.effects.popup('THE FLEET RISES!', e.x, e.y + 120, { color: PALETTE.coral, size: 34, life: 1.6 });
      world.particles.ring(e.x, e.y, e.r, e.r * 3.2, 0.7, '#7fe0d4', 8);
      e.step = 0;
    }

    const speed = Math.hypot(e.vx, e.vy);
    if (speed > 70 && Math.random() < 0.4) {
      world.particles.foam(e.x - Math.cos(e.heading) * 140, e.y - Math.sin(e.heading) * 140, 18, 0.7);
    }

    if (e.state === 'enter') {
      e.timer += dt;
      const progress = Math.min(1, e.timer / ENTER_TIME);
      e.y = -230 + (HOME_Y + 230) * easeOutCubic(progress);
      e.vx = 0;
      e.vy = (1 - progress) * 160;
      if (progress >= 1) {
        e.invulnerable = false;
        this.beginSail(e, world, 1.8);
      }
    } else if (e.state === 'sail') {
      const dx = e.waypoint.x - e.x;
      const dy = e.waypoint.y - e.y;
      const gap = Math.hypot(dx, dy) || 1;
      const pace = (phase === 1 ? 92 : 128) * (gap > 40 ? 1 : gap / 40);
      e.vx = (dx / gap) * pace;
      e.vy = (dy / gap) * pace;
      if (gap > 30) e.heading = turnToward(e.heading, Math.atan2(dy, dx), 1.3 * dt);
      e.timer -= dt;
      if (e.timer <= 0) this.chooseMove(e, world);
    } else if (e.state === 'turn') {
      e.vx *= 0.9;
      e.vy *= 0.9;
      e.heading = turnToward(e.heading, e.broadsideHeading, 2.6 * dt);
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'lanes';
        e.timer = LANE_TIME;
        e.heading = e.broadsideHeading;
        audio.play('warn');
      }
    } else if (e.state === 'lanes') {
      e.vx *= 0.9;
      e.vy *= 0.9;
      e.timer -= dt;
      if (e.timer <= 0) {
        fireVolley(e, world);
        if (e.double) later(e, 0.8, () => fireVolley(e, world));
        e.state = 'recover';
        e.timer = e.double ? 1.7 : 1.0;
      }
    } else if (e.state === 'aim') {
      e.vx *= 0.9;
      e.vy *= 0.9;
      e.heading = turnToward(e.heading, toBoat, 4.2 * dt);
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'charge';
        e.timer = CHARGE_TIME;
        e.chargeX = Math.cos(e.heading);
        e.chargeY = Math.sin(e.heading);
        audio.play('roar');
      }
    } else if (e.state === 'charge') {
      const pace = 540 + (phase === 2 ? 60 : 0);
      e.vx = e.chargeX * pace;
      e.vy = e.chargeY * pace;
      e.timer -= dt;
      if (Math.random() < 0.8) world.particles.foam(e.x - e.chargeX * 120, e.y - e.chargeY * 120, 18, 0.7);
      const bonk = e.x < 120 || e.x > W - 120 || e.y < 110 || e.y > H - 90;
      if (bonk) {
        e.state = 'dazed';
        e.timer = DAZE_TIME;
        e.vx = 0;
        e.vy = 0;
        world.effects.addShake(18);
        world.effects.popup('RAN AGROUND!', e.x, e.y - 100, { color: PALETTE.gold, size: 34, life: 1.2 });
        world.particles.splash(e.x, e.y, 30, PALETTE.foam, 460);
        audio.play('stomp');
      } else if (e.timer <= 0) {
        e.state = 'recover';
        e.timer = 0.8;
      }
    } else if (e.state === 'dazed') {
      e.vx *= 0.88;
      e.vy *= 0.88;
      e.timer -= dt;
      if (e.timer <= 0) this.beginSail(e, world, 1.4);
    } else if (e.state === 'layer') {
      e.timer -= dt;
      e.dropCd -= dt;
      const cos = Math.cos(e.heading);
      const sin = Math.sin(e.heading);
      e.vx = cos * 130;
      e.vy = sin * 130;
      if (e.dropCd <= 0 && e.dropped < 4) {
        e.dropCd = 0.4;
        e.dropped += 1;
        if (layMine(world, e.x - cos * 130 + world.rng.range(-25, 25), e.y - sin * 130 + world.rng.range(-25, 25))) {
          audio.play('click');
        }
      }
      if (e.timer <= 0) this.beginSail(e, world, 1.2);
    } else if (e.state === 'recover') {
      e.vx *= 0.92;
      e.vy *= 0.92;
      e.timer -= dt;
      if (e.timer <= 0) this.beginSail(e, world, 1.4);
    } else if (e.state === 'crew') {
      e.vx *= 0.9;
      e.vy *= 0.9;
      e.timer -= dt;
      if (e.timer <= 0) {
        summonCrew(e, world);
        e.state = 'recover';
        e.timer = 0.8;
      }
    }

    // Keep the patrolling ship in the open water; a charge may leave it.
    if (e.state !== 'charge' && e.state !== 'dazed') {
      e.x = clamp(e.x, 150, W - 150);
      e.y = clamp(e.y, 150, 540);
    }
    placeParts(e);
  },

  beginSail(e, world, seconds) {
    const { rng } = world;
    e.state = 'sail';
    e.timer = seconds;
    e.waypoint = { x: rng.range(240, W - 240), y: rng.range(190, 420) };
  },

  chooseMove(e, world) {
    const boat = world.boat;
    const plan = phaseOf(e) === 1 ? PLAN_ONE : PLAN_TWO;
    const move = plan[e.step % plan.length];
    e.step += 1;
    e.double = false;
    if (move === 'broadside' || move === 'volley') {
      e.state = 'turn';
      e.timer = TURN_TIME;
      e.double = move === 'volley';
      const toBoat = Math.atan2(boat.y - e.y, boat.x - e.x);
      const options = [toBoat + Math.PI / 2, toBoat - Math.PI / 2];
      const better = options.sort((a, b) => Math.abs(Math.atan2(Math.sin(a - e.heading), Math.cos(a - e.heading))) - Math.abs(Math.atan2(Math.sin(b - e.heading), Math.cos(b - e.heading))));
      e.broadsideHeading = better[0];
      audio.play('warn');
    } else if (move === 'ram') {
      e.state = 'aim';
      e.timer = AIM_TIME;
      audio.play('warn');
    } else if (move === 'mines') {
      e.state = 'layer';
      e.timer = 1.8;
      e.dropCd = 0.2;
      e.dropped = 0;
    } else {
      e.state = 'crew';
      e.timer = 0.9;
      audio.play('warn');
    }
  },

  onDeath(e, world) {
    world.bossDown(e.x, e.y);
  },

  draw(ctx, e, world) {
    const cos = Math.cos(e.heading);
    const sin = Math.sin(e.heading);

    // Warnings: cannon lanes and the ram line.
    if (e.state === 'lanes') {
      const progress = 1 - Math.max(0, e.timer) / LANE_TIME;
      ctx.save();
      ctx.lineWidth = 6;
      ctx.setLineDash([22, 14]);
      ctx.lineDashOffset = -e.age * 120;
      ctx.strokeStyle = Math.floor(e.age * 12) % 2 && progress > 0.6 ? 'rgba(255, 255, 255, 0.9)' : `rgba(232, 55, 74, ${0.45 + 0.45 * progress})`;
      for (const offset of PORTS) {
        for (const side of [-1, 1]) {
          const nx = -sin * side;
          const ny = cos * side;
          const sx = e.x + cos * offset + nx * HULL_HALF;
          const sy = e.y + sin * offset + ny * HULL_HALF;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + nx * LANE_REACH, sy + ny * LANE_REACH);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (e.state === 'aim') {
      ctx.save();
      ctx.strokeStyle = Math.floor(e.age * 14) % 2 ? PALETTE.red : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 5;
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + cos * 900, e.y + sin * 900);
      ctx.stroke();
      ctx.restore();
    }

    const firing = e.state === 'lanes' ? 1 - Math.max(0, e.timer) / LANE_TIME : 0;

    // A cold glow around the ghost ship.
    ctx.save();
    ctx.translate(e.x, e.y);
    const aura = ctx.createRadialGradient(0, 0, 40, 0, 0, 230);
    aura.addColorStop(0, 'rgba(110, 255, 225, 0.2)');
    aura.addColorStop(1, 'rgba(110, 255, 225, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 230, 0, TAU);
    ctx.fill();

    ctx.rotate(e.heading);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const hull = new Path2D();
    hull.moveTo(158, 0);
    hull.bezierCurveTo(100, -34, 70, -HULL_HALF - 6, 10, -HULL_HALF - 6);
    hull.lineTo(-120, -HULL_HALF);
    hull.quadraticCurveTo(-156, -44, -156, -22);
    hull.lineTo(-156, 22);
    hull.quadraticCurveTo(-156, 44, -120, HULL_HALF);
    hull.lineTo(10, HULL_HALF + 6);
    hull.bezierCurveTo(70, HULL_HALF + 6, 100, 34, 158, 0);
    hull.closePath();

    const wood = ctx.createLinearGradient(0, -HULL_HALF, 0, HULL_HALF);
    wood.addColorStop(0, '#7d9a92');
    wood.addColorStop(0.5, '#4f6e68');
    wood.addColorStop(1, '#2c4442');
    ctx.fillStyle = wood;
    ctx.fill(hull);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0a1517';
    ctx.stroke(hull);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(170, 255, 236, 0.9)';
    ctx.stroke(hull);

    // Deck planks.
    ctx.save();
    ctx.clip(hull);
    ctx.strokeStyle = 'rgba(8, 20, 22, 0.5)';
    ctx.lineWidth = 2.5;
    for (let y = -36; y <= 36; y += 12) {
      ctx.beginPath();
      ctx.moveTo(-160, y);
      ctx.lineTo(160, y * 0.6);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(190, 235, 220, 0.2)';
    ctx.beginPath();
    ctx.ellipse(-10, 0, 110, 30, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Cannon ports on both sides.
    for (const offset of PORTS) {
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#10191b';
        ctx.fillRect(offset - 9, side * HULL_HALF - 6 + (side > 0 ? 0 : 0), 18, 12);
        const lit = firing > 0 ? 0.4 + 0.6 * Math.abs(Math.sin(e.age * 16)) : 0.25;
        ctx.fillStyle = `rgba(255, 150, 60, ${lit})`;
        ctx.beginPath();
        ctx.arc(offset, side * (HULL_HALF + 5), firing > 0 ? 9 : 5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#0a1012';
        ctx.fillRect(offset - 4, side * (HULL_HALF - 2) + (side > 0 ? 0 : -10), 8, 10);
      }
    }

    // Masts and tattered sails, seen from above.
    for (const [mx, span] of [[62, 36], [-6, 46], [-76, 34]]) {
      ctx.fillStyle = 'rgba(214, 240, 232, 0.88)';
      ctx.strokeStyle = 'rgba(30, 60, 58, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 7, -span);
      for (let i = 0; i <= 8; i += 1) {
        const y = -span + (i / 8) * span * 2;
        ctx.lineTo(mx + 7 + (i % 2 ? 3 : -2) + Math.sin(e.age * 2 + i + mx) * 2, y);
      }
      ctx.lineTo(mx - 7, span);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a1e12';
      ctx.beginPath();
      ctx.arc(mx, 0, 6, 0, TAU);
      ctx.fill();
    }

    // Figurehead, helm and a cold lantern.
    ctx.fillStyle = '#d9ece6';
    ctx.beginPath();
    ctx.arc(138, 0, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10191b';
    ctx.beginPath();
    ctx.arc(135, -3, 2.4, 0, TAU);
    ctx.arc(135, 3, 2.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#7c5a32';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-124, 0, 12, 0, TAU);
    ctx.stroke();
    const flame = 0.6 + 0.4 * Math.sin(e.age * 9);
    const lamp = ctx.createRadialGradient(-140, 0, 1, -140, 0, 26);
    lamp.addColorStop(0, `rgba(160, 255, 235, ${0.9 * flame})`);
    lamp.addColorStop(1, 'rgba(160, 255, 235, 0)');
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(-140, 0, 26, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (e.invulnerable) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(e.age * 12);
      ctx.fillStyle = '#ffffff';
      for (const part of e.parts) {
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if (e.stun > 0) {
      ctx.save();
      for (let i = 0; i < 3; i += 1) {
        const a = e.age * 5 + (i / 3) * TAU;
        const sx = e.x + Math.cos(a) * 54;
        const sy = e.y + Math.sin(a) * 16 - 90;
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        for (let k = 0; k < 10; k += 1) {
          const rr = k % 2 ? 4 : 9;
          const aa = (k / 10) * TAU - Math.PI / 2;
          const px = sx + Math.cos(aa) * rr;
          const py = sy + Math.sin(aa) * rr;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    void world;
  },
};
