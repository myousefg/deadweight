// The Kraken: the final wave's boss. It drifts across the top of the arena and rotates through
// attacks that grow meaner in three phases: telegraphed tentacle slams, fans of ink, and
// summoned jellies. Hit its body with a fast anchor; dodge everything else.

import { W, PALETTE } from '../config.js';
import { TAU, clamp, easeOutCubic } from '../math.js';
import { audio } from '../audio.js';
import { addSlam } from '../hazards.js';
import { spawnProjectile } from '../projectiles.js';

const HOME_Y = 150;
const ENTER_TIME = 2.6;
const COOLDOWN = [0, 3.0, 2.4, 1.9];

function phaseOf(e) {
  const fraction = e.hp / e.maxHp;
  if (fraction > 0.66) return 1;
  if (fraction > 0.33) return 2;
  return 3;
}

/** Run `action` after `delay` seconds; the boss's update drains this queue. */
function later(e, delay, action) {
  e.queue.push({ delay, action });
}

function slamBoat(e, world, count) {
  for (let i = 0; i < count; i += 1) {
    later(e, i * 0.5, () => {
      const boat = world.boat;
      const x = clamp(boat.x + boat.vx * 0.35, 90, W - 90);
      const y = clamp(boat.y + boat.vy * 0.35, 200, 660);
      addSlam(world, e, x, y, 78, 1.15, 1);
      audio.play('warn');
    });
  }
}

function slamRain(e, world, count) {
  for (let i = 0; i < count; i += 1) {
    later(e, i * 0.28, () => {
      const x = world.rng.range(110, W - 110);
      const y = world.rng.range(240, 650);
      addSlam(world, e, x, y, 70, 1.3, 1);
    });
  }
}

function inkFan(e, world, count, spread) {
  const boat = world.boat;
  const toBoat = Math.atan2(boat.y - e.y, boat.x - e.x);
  audio.play('spit');
  for (let i = 0; i < count; i += 1) {
    const angle = toBoat + (i - (count - 1) / 2) * (spread / Math.max(1, count - 1));
    spawnProjectile(world, {
      x: e.x + Math.cos(angle) * 70,
      y: e.y + Math.sin(angle) * 70,
      vx: Math.cos(angle) * 250,
      vy: Math.sin(angle) * 250,
      r: 11,
      damage: 1,
      kind: 'ink',
      life: 4,
    });
  }
}

function summonJellies(e, world, count) {
  audio.play('roar');
  for (let i = 0; i < count; i += 1) {
    const angle = Math.PI * (0.25 + (0.5 * i) / Math.max(1, count - 1));
    world.spawnEnemy('jelly', e.x + Math.cos(angle) * 110, e.y + Math.sin(angle) * 110);
  }
}

function chooseAttack(e, world) {
  const phase = phaseOf(e);
  e.attackIndex += 1;
  const turn = e.attackIndex;
  if (phase === 1) {
    if (turn % 2) slamBoat(e, world, 1);
    else inkFan(e, world, 5, 1.0);
  } else if (phase === 2) {
    if (turn % 3 === 0) slamBoat(e, world, 2);
    else if (turn % 3 === 1) inkFan(e, world, 7, 1.5);
    else summonJellies(e, world, 3);
  } else if (turn % 3 === 0) slamRain(e, world, 6);
  else if (turn % 3 === 1) {
    inkFan(e, world, 9, 2.2);
    later(e, 0.6, () => inkFan(e, world, 9, 2.2));
  } else slamBoat(e, world, 3);
}

export const kraken = {
  id: 'kraken',
  name: 'The Kraken',
  boss: true,
  radius: 86,
  hp: 170,
  mass: 90,
  contact: 1,
  score: 5000,
  pearls: [0, 0],

  init(e, world) {
    e.hp = Math.round(e.hp * (world.stormy ? 1.15 : 1));
    e.maxHp = e.hp;
    e.x = W / 2;
    e.y = -180;
    e.state = 'enter';
    e.timer = 0;
    e.cd = 2.2;
    e.queue = [];
    e.attackIndex = 0;
    e.phaseNo = 1;
    e.invulnerable = true;
    audio.play('roar');
    world.effects.addShake(10);
  },

  update(e, world, dt) {
    if (e.state === 'enter') {
      e.timer += dt;
      const progress = Math.min(1, e.timer / ENTER_TIME);
      e.y = -180 + (HOME_Y + 180) * easeOutCubic(progress);
      e.vx = 0;
      e.vy = 0;
      if (progress >= 1) {
        e.state = 'fight';
        e.invulnerable = false;
      }
      return;
    }

    const targetX = W / 2 + Math.sin(e.age * 0.45) * 310;
    const targetY = HOME_Y + Math.sin(e.age * 0.9) * 14;
    e.vx = (targetX - e.x) * 3;
    e.vy = (targetY - e.y) * 3;

    const phase = phaseOf(e);
    if (phase !== e.phaseNo) {
      e.phaseNo = phase;
      audio.play('roar');
      world.effects.addShake(16);
      world.effects.popup(phase === 3 ? 'ENRAGED!' : 'IT GROWS ANGRY', e.x, e.y + 120, { color: PALETTE.coral, size: 34, life: 1.6 });
      world.particles.ring(e.x, e.y, e.r, e.r * 3, 0.7, PALETTE.violet, 8);
      e.cd = Math.max(e.cd, 1.4);
    }

    for (let i = e.queue.length - 1; i >= 0; i -= 1) {
      const item = e.queue[i];
      item.delay -= dt;
      if (item.delay <= 0) {
        e.queue.splice(i, 1);
        item.action();
      }
    }

    e.cd -= dt;
    if (e.cd <= 0) {
      chooseAttack(e, world);
      e.cd = COOLDOWN[phase];
    }
  },

  onDeath(e, world) {
    world.beginFinale(e.x, e.y);
  },

  draw(ctx, e, world) {
    const r = e.r;
    const boat = world.boat;
    const phase = e.phaseNo;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.lineCap = 'round';

    for (let i = 0; i < 8; i += 1) {
      const base = (i / 8) * TAU + Math.sin(e.age * 0.8 + i) * 0.12 + Math.PI / 8;
      const curl = Math.sin(e.age * 1.7 + i * 1.3) * 0.9;
      let px = Math.cos(base) * r * 0.7;
      let py = Math.sin(base) * r * 0.7;
      let heading = base;
      for (let k = 0; k < 11; k += 1) {
        const width = 34 - k * 2.6;
        heading += curl * 0.11 * (k / 6);
        const nx = px + Math.cos(heading) * 15;
        const ny = py + Math.sin(heading) * 15;
        ctx.strokeStyle = k % 2 ? '#3d1a66' : '#4a2279';
        ctx.lineWidth = Math.max(5, width);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        if (k % 2 === 0 && width > 12) {
          ctx.fillStyle = '#e9b8ff';
          ctx.beginPath();
          ctx.arc(nx, ny, 2.4, 0, TAU);
          ctx.fill();
        }
        px = nx;
        py = ny;
      }
    }

    const mantle = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r * 1.05);
    mantle.addColorStop(0, phase === 3 ? '#c24a9a' : '#a64fc9');
    mantle.addColorStop(0.6, phase === 3 ? '#7a1f6c' : '#6a2c9c');
    mantle.addColorStop(1, '#2d1250');
    ctx.fillStyle = mantle;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 220, 255, 0.35)';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 200, 240, 0.22)';
    [[-0.3, -0.45, 0.14], [0.35, -0.5, 0.1], [0.05, -0.2, 0.08], [-0.55, -0.1, 0.09], [0.55, -0.15, 0.12]].forEach(([x, y, s]) => {
      ctx.beginPath();
      ctx.arc(x * r, y * r, s * r, 0, TAU);
      ctx.fill();
    });

    const look = Math.atan2(boat.y - e.y, boat.x - e.x);
    for (const side of [-1, 1]) {
      const ex = side * r * 0.36;
      const ey = r * 0.18;
      ctx.fillStyle = '#fff8e6';
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.24, r * 0.2, side * 0.25, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#2d1250';
      ctx.stroke();
      ctx.fillStyle = phase === 3 ? PALETTE.red : PALETTE.gold;
      ctx.beginPath();
      ctx.arc(ex + Math.cos(look) * r * 0.08, ey + Math.sin(look) * r * 0.07, r * 0.11, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#10051f';
      ctx.beginPath();
      ctx.ellipse(ex + Math.cos(look) * r * 0.08, ey + Math.sin(look) * r * 0.07, r * 0.035, r * 0.1, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2d1250';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(ex - side * r * 0.3, ey - r * 0.3 + side * 6);
      ctx.lineTo(ex + side * r * 0.2, ey - r * 0.12);
      ctx.stroke();
    }

    if (e.invulnerable) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(e.age * 12);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.05, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },
};
