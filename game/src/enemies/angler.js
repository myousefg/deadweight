// Anglerfish: a deep-water summoner. It hangs back in the gloom and every few seconds blazes its
// lure to call a pair of jellies out of the dark. Its lure is also its weak spot: a blow that
// lands on the glowing bulb does double damage, so sink it before the school grows.

import { PALETTE } from '../config.js';
import { TAU, turnToward, easeOutCubic } from '../math.js';
import { audio } from '../audio.js';

const CALL_TIME = 1.0;
const CALL_EVERY = [4.6, 6.2];
const MAX_CALLED = 6;
const ALIVE_LIMIT = 17;

function placeParts(e) {
  const cos = Math.cos(e.heading);
  const sin = Math.sin(e.heading);
  const reach = e.r * 1.62 + Math.sin(e.age * 3) * 3;
  e.parts = [
    { x: e.x, y: e.y, r: e.r },
    { x: e.x + cos * reach, y: e.y + sin * reach, r: 12, weak: 2 },
  ];
}

export const angler = {
  id: 'angler',
  name: 'Anglerfish',
  radius: 27,
  hp: 9,
  mass: 3,
  contact: 1,
  score: 520,
  pearls: [3, 5],

  init(e, world) {
    e.state = 'prowl';
    e.timer = world.rng.range(2.2, 3.4);
    e.called = 0;
    e.strafe = world.rng.sign();
    placeParts(e);
  },

  update(e, world, dt) {
    const boat = world.boat;
    const dx = boat.x - e.x;
    const dy = boat.y - e.y;
    const gap = Math.hypot(dx, dy) || 1;
    const toBoat = Math.atan2(dy, dx);
    e.heading = turnToward(e.heading, toBoat, 2.2 * dt);
    e.timer -= dt;

    if (e.state === 'prowl') {
      let speed = 0;
      if (world.hunt) speed = gap > 150 ? 110 : 0;
      else if (gap < 280) speed = -90;
      else if (gap > 420) speed = 70;
      const side = e.strafe * 34;
      e.vx = (dx / gap) * speed * world.speedScale + (-dy / gap) * side;
      e.vy = (dy / gap) * speed * world.speedScale + (dx / gap) * side;
      if (e.timer <= 0 && e.called < MAX_CALLED && world.enemies.length < ALIVE_LIMIT) {
        e.state = 'call';
        e.timer = CALL_TIME;
        audio.play('warn');
      } else if (e.timer <= 0) {
        e.timer = 1.5;
      }
    } else {
      e.vx *= 0.9;
      e.vy *= 0.9;
      if (e.timer <= 0) {
        const cos = Math.cos(e.heading);
        const sin = Math.sin(e.heading);
        const lureX = e.x + cos * e.r * 1.62;
        const lureY = e.y + sin * e.r * 1.62;
        for (const side of [-1, 1]) {
          world.spawnEnemy('jelly', lureX - sin * side * 38, lureY + cos * side * 38);
        }
        e.called += 2;
        world.particles.ring(lureX, lureY, 10, 110, 0.5, '#fff6a8', 5);
        audio.play('spit');
        e.state = 'prowl';
        e.timer = world.rng.range(CALL_EVERY[0], CALL_EVERY[1]);
      }
    }
    placeParts(e);
  },

  draw(ctx, e) {
    const r = e.r;
    const calling = e.state === 'call' ? 1 - Math.max(0, e.timer) / CALL_TIME : 0;
    const lure = e.parts[1];
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.heading);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Tail and fins.
    const wag = Math.sin(e.age * 6) * 0.25;
    ctx.fillStyle = '#1f4f5c';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.lineTo(-r * 1.65, -r * 0.62 + wag * r);
    ctx.lineTo(-r * 1.4, 0);
    ctx.lineTo(-r * 1.65, r * 0.62 + wag * r);
    ctx.closePath();
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, side * r * 0.8);
      ctx.lineTo(-r * 0.7, side * r * 1.35 + wag * r * side);
      ctx.lineTo(r * 0.2, side * r * 0.95);
      ctx.closePath();
      ctx.fill();
    }

    // The lure's stalk.
    ctx.strokeStyle = '#102a33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.2);
    ctx.quadraticCurveTo(r * 1.1, -r * 0.95, r * 1.62, Math.sin(e.age * 3) * 3);
    ctx.stroke();

    // Body.
    const body = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 3, 0, 0, r * 1.1);
    body.addColorStop(0, '#3e8a99');
    body.addColorStop(0.65, '#1e5866');
    body.addColorStop(1, '#0d2c36');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.95, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#0a2028';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Mouth and teeth.
    ctx.fillStyle = '#0a1418';
    ctx.beginPath();
    ctx.ellipse(r * 0.62, 0, r * 0.55, r * (0.36 + calling * 0.1), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f2f6f8';
    for (let i = 0; i < 6; i += 1) {
      const u = (i - 2.5) / 2.5;
      const x = r * (0.5 + 0.3 * Math.cos(u * 1.2));
      ctx.beginPath();
      ctx.moveTo(x - 3, -r * 0.34 * Math.abs(1 - u * u * 0.3));
      ctx.lineTo(x, -r * 0.34 + 9);
      ctx.lineTo(x + 3, -r * 0.34 * Math.abs(1 - u * u * 0.3));
      ctx.moveTo(x - 3, r * 0.34 * Math.abs(1 - u * u * 0.3));
      ctx.lineTo(x, r * 0.34 - 9);
      ctx.lineTo(x + 3, r * 0.34 * Math.abs(1 - u * u * 0.3));
      ctx.fill();
    }

    // Eye.
    ctx.fillStyle = '#e8f7a8';
    ctx.beginPath();
    ctx.arc(r * 0.2, -r * 0.5, r * 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10051f';
    ctx.beginPath();
    ctx.arc(r * 0.26, -r * 0.5, r * 0.09, 0, TAU);
    ctx.fill();
    ctx.restore();

    // The glowing lure, drawn in world space so it ignores the body's rotation.
    const glow = 16 + 10 * calling * easeOutCubic(calling) + Math.sin(e.age * 5) * 2;
    ctx.save();
    const halo = ctx.createRadialGradient(lure.x, lure.y, 1, lure.x, lure.y, glow * 3);
    halo.addColorStop(0, `rgba(255, 246, 168, ${0.6 + 0.3 * calling})`);
    halo.addColorStop(1, 'rgba(255, 246, 168, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(lure.x, lure.y, glow * 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = calling > 0 ? '#ffffff' : '#fff6a8';
    ctx.beginPath();
    ctx.arc(lure.x, lure.y, 9 + calling * 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (calling > 0) {
      ctx.strokeStyle = `rgba(255, 246, 168, ${0.8 * (1 - calling)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(lure.x, lure.y, 20 + 70 * calling, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  },
};
