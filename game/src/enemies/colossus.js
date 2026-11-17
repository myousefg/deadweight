// Hermit Colossus: the Sunlit Shallows boss, a house-sized crab in a spiral shell. Its armour turns
// most blows aside, so the plan is to survive its two moves and punish what follows:
//   stomp  - a shockwave ring spreads from it (dash through the ring to take no harm)
//   lunge  - a red line warns, it charges, and if it bonks a wall it is dazed and takes big damage

import { W, H, PALETTE } from '../config.js';
import { TAU, easeOutCubic, turnToward } from '../math.js';
import { audio } from '../audio.js';
import { addRing } from '../hazards.js';

const HOME_Y = 190;
const ENTER_TIME = 2.4;
const WINDUP = 0.95;
const AIM = 0.9;
const CHARGE = 0.75;
const DAZE = 2.3;
const ARMOUR = 0.5;
const DAZED_DAMAGE = 1.2;
const RING_REACH = 520;

const phaseOf = (e) => (e.hp / e.maxHp > 0.5 ? 1 : 2);

/** The body and both claws as hit circles, placed from the crab's heading. */
function placeParts(e) {
  const cos = Math.cos(e.heading);
  const sin = Math.sin(e.heading);
  const claw = (side) => {
    const forward = e.r * 1.22;
    const across = side * e.r * (0.62 + 0.3 * e.open);
    return { x: e.x + cos * forward - sin * across, y: e.y + sin * forward + cos * across, r: e.r * 0.4 };
  };
  e.parts = [{ x: e.x, y: e.y, r: e.r }, claw(-1), claw(1)];
}

export const colossus = {
  id: 'colossus',
  name: 'Hermit Colossus',
  boss: true,
  radius: 66,
  hp: 100,
  mass: 90,
  contact: 1,
  score: 3000,
  pearls: [0, 0],

  init(e, world) {
    e.hp = Math.round(100 * (world.stormy ? 1.15 : 1));
    e.maxHp = e.hp;
    e.x = W / 2;
    e.y = -170;
    e.heading = Math.PI / 2;
    e.state = 'enter';
    e.timer = 0;
    e.open = 0;
    e.next = 'stomp';
    e.second = 0;
    e.invulnerable = true;
    e.damageTaken = ARMOUR;
    placeParts(e);
    audio.play('roar');
    world.effects.addShake(10);
  },

  update(e, world, dt) {
    const boat = world.boat;
    const toBoat = Math.atan2(boat.y - e.y, boat.x - e.x);
    const phase = phaseOf(e);
    const wantOpen = e.state === 'stomp' || e.state === 'aim' || e.state === 'charge' ? 1 : e.state === 'dazed' ? 0.4 : 0.15;
    e.open += (wantOpen - e.open) * Math.min(1, 8 * dt);
    e.damageTaken = e.state === 'dazed' ? DAZED_DAMAGE : ARMOUR;
    e.stun = e.state === 'dazed' ? Math.max(0, e.timer) : 0;

    if (e.state === 'enter') {
      e.timer += dt;
      const progress = Math.min(1, e.timer / ENTER_TIME);
      e.y = -170 + (HOME_Y + 170) * easeOutCubic(progress);
      e.vx = 0;
      e.vy = 0;
      if (progress >= 1) {
        e.state = 'walk';
        e.timer = 2.4;
        e.invulnerable = false;
      }
    } else if (e.state === 'walk') {
      e.heading = turnToward(e.heading, toBoat, 1.8 * dt);
      const speed = phase === 1 ? 62 : 88;
      e.vx = Math.cos(e.heading) * speed;
      e.vy = Math.sin(e.heading) * speed;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = e.next === 'stomp' ? 'stomp' : 'aim';
        e.timer = e.state === 'stomp' ? WINDUP : AIM;
        e.next = e.next === 'stomp' ? 'lunge' : 'stomp';
        audio.play('warn');
      }
    } else if (e.state === 'stomp') {
      e.vx = 0;
      e.vy = 0;
      e.heading = turnToward(e.heading, toBoat, 1.2 * dt);
      e.timer -= dt;
      if (e.timer <= 0) {
        addRing(world, e.x, e.y, 340, RING_REACH, 1);
        if (phase === 2) e.second = 0.5;
        audio.play('stomp');
        world.effects.addShake(13);
        world.particles.splash(e.x, e.y, 30, PALETTE.foam, 420);
        e.state = 'recover';
        e.timer = 0.9;
      }
    } else if (e.state === 'recover') {
      e.vx *= 0.9;
      e.vy *= 0.9;
      if (e.second > 0) {
        e.second -= dt;
        if (e.second <= 0) {
          addRing(world, e.x, e.y, 340, RING_REACH, 1);
          audio.play('stomp');
          world.effects.addShake(10);
        }
      }
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'walk';
        e.timer = world.rng.range(2.0, 2.8);
      }
    } else if (e.state === 'aim') {
      e.vx = 0;
      e.vy = 0;
      e.heading = turnToward(e.heading, toBoat, 5 * dt);
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'charge';
        e.timer = CHARGE;
        e.chargeX = Math.cos(e.heading);
        e.chargeY = Math.sin(e.heading);
        audio.play('roar');
      }
    } else if (e.state === 'charge') {
      e.vx = e.chargeX * 560;
      e.vy = e.chargeY * 560;
      e.timer -= dt;
      if (Math.random() < 0.7) world.particles.foam(e.x - e.chargeX * 60, e.y - e.chargeY * 60, 14, 0.6);
      const bonk = e.x < 80 || e.x > W - 80 || e.y < 100 || e.y > H - 70;
      if (bonk || e.timer <= 0) {
        e.state = 'dazed';
        e.timer = DAZE;
        e.vx = 0;
        e.vy = 0;
        if (bonk) {
          world.effects.addShake(16);
          world.effects.popup('BONK!', e.x, e.y - 90, { color: PALETTE.gold, size: 34, life: 1.1 });
          audio.play('stomp');
        }
      }
    } else {
      e.vx *= 0.88;
      e.vy *= 0.88;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'walk';
        e.timer = 2.0;
      }
    }
    placeParts(e);
  },

  onDeath(e, world) {
    world.bossDown(e.x, e.y);
  },

  draw(ctx, e) {
    const r = e.r;
    if (e.state === 'aim') {
      ctx.save();
      ctx.strokeStyle = Math.floor(e.age * 14) % 2 ? PALETTE.red : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.heading) * 760, e.y + Math.sin(e.heading) * 760);
      ctx.stroke();
      ctx.restore();
    }
    if (e.state === 'stomp') {
      const progress = 1 - Math.max(0, e.timer) / WINDUP;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 107, 87, ${0.35 + 0.5 * progress})`;
      ctx.lineWidth = 5;
      ctx.setLineDash([18, 12]);
      ctx.lineDashOffset = -e.age * 80;
      ctx.beginPath();
      ctx.arc(e.x, e.y, RING_REACH, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255, 200, 61, ${0.8 * progress})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * (1.1 + progress * 0.5), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.heading);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const scuttle = e.state === 'walk' || e.state === 'charge' ? 1 : 0.2;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const baseX = -r * 0.35 + i * r * 0.38;
        const sway = Math.sin(e.age * 8 + i * 1.8 + side) * 7 * scuttle;
        ctx.strokeStyle = '#a63a24';
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(baseX, side * r * 0.55);
        ctx.lineTo(baseX + sway, side * r * 1.05);
        ctx.lineTo(baseX + sway * 1.6 + 10, side * r * 1.32);
        ctx.stroke();
        ctx.strokeStyle = '#e2573c';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    }

    for (const side of [-1, 1]) {
      const shoulderX = r * 0.5;
      const shoulderY = side * r * 0.5;
      const palmX = r * 1.18;
      const palmY = side * r * (0.62 + 0.3 * e.open);
      ctx.strokeStyle = '#a63a24';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(palmX - 14, palmY);
      ctx.stroke();
      ctx.strokeStyle = '#e2573c';
      ctx.lineWidth = 11;
      ctx.stroke();
      const spread = 0.18 + 0.5 * e.open;
      for (const jaw of [-1, 1]) {
        ctx.save();
        ctx.translate(palmX, palmY);
        ctx.rotate(jaw * spread);
        ctx.fillStyle = '#e2573c';
        ctx.strokeStyle = '#7a2616';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, jaw * 4);
        ctx.quadraticCurveTo(r * 0.28, jaw * 20, r * 0.46, jaw * 4);
        ctx.quadraticCurveTo(r * 0.2, jaw * 6, -8, jaw * -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#f08060';
      ctx.beginPath();
      ctx.arc(palmX, palmY, r * 0.24, 0, TAU);
      ctx.fill();
    }

    const body = ctx.createRadialGradient(r * 0.1, -r * 0.2, r * 0.1, 0, 0, r);
    body.addColorStop(0, '#ff8a63');
    body.addColorStop(1, '#c23f28');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.98, r * 0.82, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7a2616';
    ctx.stroke();

    const shell = ctx.createRadialGradient(-r * 0.45, -r * 0.2, r * 0.05, -r * 0.3, 0, r * 0.85);
    shell.addColorStop(0, '#fff6e0');
    shell.addColorStop(0.55, '#f4c9a8');
    shell.addColorStop(1, '#b97a5c');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(-r * 0.3, 0, r * 0.74, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7a4a34';
    ctx.stroke();
    ctx.beginPath();
    for (let a = 0.2; a < 4.6 * Math.PI; a += 0.12) {
      const radius = a * r * 0.06;
      const x = -r * 0.3 + Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      if (a === 0.2) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#8a5a44';
    ctx.lineWidth = 4;
    ctx.stroke();

    for (const side of [-1, 1]) {
      ctx.strokeStyle = '#a63a24';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(r * 0.62, side * r * 0.16);
      ctx.lineTo(r * 0.86, side * r * 0.24);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r * 0.88, side * r * 0.25, 9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#10051f';
      ctx.beginPath();
      ctx.arc(r * 0.92, side * r * 0.25, 4.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    if (e.invulnerable) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(e.age * 12);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 1.05, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    if (e.stun > 0) {
      ctx.save();
      for (let i = 0; i < 3; i += 1) {
        const a = e.age * 5 + (i / 3) * TAU;
        const sx = e.x + Math.cos(a) * 44;
        const sy = e.y + Math.sin(a) * 14 - 80;
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
  },
};
