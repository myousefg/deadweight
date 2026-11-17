// Manta ray: a glider that circles the boat and calls lightning on wherever it expects you to be.
// It flashes blue and a marker appears on the water; leave the circle before the bolt lands.
// Its wide wings are hit boxes too, so a swing that catches a wing tip still counts.

import { W } from '../config.js';
import { TAU, clamp, turnToward } from '../math.js';
import { audio } from '../audio.js';
import { addSlam } from '../hazards.js';

const CHARGE = 0.95;
const RECOVER = 0.6;

function placeParts(e) {
  const cos = Math.cos(e.heading);
  const sin = Math.sin(e.heading);
  const span = e.r * 1.55;
  const flap = 1 - 0.18 * Math.sin(e.age * 5);
  e.parts = [
    { x: e.x, y: e.y, r: e.r },
    { x: e.x - sin * span * flap, y: e.y + cos * span * flap, r: e.r * 0.5 },
    { x: e.x + sin * span * flap, y: e.y - cos * span * flap, r: e.r * 0.5 },
  ];
}

export const manta = {
  id: 'manta',
  name: 'Manta Ray',
  radius: 24,
  hp: 6,
  mass: 2,
  contact: 1,
  score: 400,
  pearls: [2, 3],

  init(e, world) {
    e.state = 'glide';
    e.timer = world.rng.range(1.8, 3.2);
    e.orbit = world.rng.range(0, TAU);
    e.dir = world.rng.sign();
    e.radius = world.rng.range(250, 340);
    placeParts(e);
  },

  update(e, world, dt) {
    const boat = world.boat;
    e.timer -= dt;
    if (e.state === 'glide') {
      const hunt = world.hunt;
      const wanted = hunt ? 90 : e.radius;
      e.orbit += e.dir * 0.75 * dt * world.speedScale;
      const tx = clamp(boat.x + Math.cos(e.orbit) * wanted, 60, W - 60);
      const ty = clamp(boat.y + Math.sin(e.orbit) * wanted * 0.8, 130, 670);
      const dx = tx - e.x;
      const dy = ty - e.y;
      const gap = Math.hypot(dx, dy) || 1;
      const speed = Math.min(230 * world.speedScale, gap * 3);
      e.vx = (dx / gap) * speed;
      e.vy = (dy / gap) * speed;
      if (gap > 4) e.heading = turnToward(e.heading, Math.atan2(dy, dx), 5 * dt);
      if (e.timer <= 0) {
        e.state = 'charge';
        e.timer = CHARGE;
        const lead = 0.45;
        e.strikeX = clamp(boat.x + boat.vx * lead, 70, W - 70);
        e.strikeY = clamp(boat.y + boat.vy * lead, 150, 670);
        addSlam(world, e, e.strikeX, e.strikeY, 56, CHARGE, 1, 'bolt');
        audio.play('warn');
      }
    } else if (e.state === 'charge') {
      e.vx *= 0.9;
      e.vy *= 0.9;
      e.heading = turnToward(e.heading, Math.atan2(e.strikeY - e.y, e.strikeX - e.x), 6 * dt);
      if (e.timer <= 0) {
        e.state = 'recover';
        e.timer = RECOVER;
      }
    } else {
      e.vx *= 0.92;
      e.vy *= 0.92;
      if (e.timer <= 0) {
        e.state = 'glide';
        e.timer = world.rng.range(2.6, 3.8);
      }
    }
    placeParts(e);
  },

  draw(ctx, e) {
    const r = e.r;
    const flap = Math.sin(e.age * 5);
    const charge = e.state === 'charge' ? 1 - Math.max(0, e.timer) / CHARGE : 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.heading);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Tail whip.
    ctx.strokeStyle = '#2a4a63';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, 0);
    ctx.quadraticCurveTo(-r * 1.8, Math.sin(e.age * 7) * 10, -r * 2.6, Math.sin(e.age * 7 + 1) * 16);
    ctx.stroke();

    // Wings: two big swept triangles that beat slowly.
    const lift = 0.16 * flap;
    for (const side of [-1, 1]) {
      const tipX = -r * 0.1 - r * 0.2 * flap;
      const tipY = side * r * (2.15 + 0.2 * flap);
      const grad = ctx.createLinearGradient(0, 0, 0, tipY);
      grad.addColorStop(0, '#3f78a8');
      grad.addColorStop(1, charge > 0 ? '#bfe6ff' : '#2a5f8c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(r * 0.95, side * r * 0.2);
      ctx.quadraticCurveTo(r * 0.5, side * r * 1.2, tipX, tipY);
      ctx.quadraticCurveTo(-r * (0.55 + lift), side * r * 1.0, -r * 0.8, side * r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#12304a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(220, 245, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.4, side * r * 0.3);
      ctx.quadraticCurveTo(0, side * r * 1.1, tipX * 0.9, tipY * 0.85);
      ctx.stroke();
    }

    // Body, head fins and eyes.
    const body = ctx.createRadialGradient(r * 0.15, -r * 0.2, 2, 0, 0, r * 1.1);
    body.addColorStop(0, charge > 0 ? '#e6f6ff' : '#6aa8d6');
    body.addColorStop(1, '#2f6b9a');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.78, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#12304a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#2a5f8c';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 1.0, side * r * 0.2);
      ctx.lineTo(r * 1.5, side * r * 0.5);
      ctx.lineTo(r * 1.1, side * r * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r * 0.62, side * r * 0.36, r * 0.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = charge > 0 ? '#ff4a3a' : '#10051f';
      ctx.beginPath();
      ctx.arc(r * 0.66, side * r * 0.36, r * 0.07, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a5f8c';
    }
    if (charge > 0) {
      ctx.strokeStyle = `rgba(160, 220, 255, ${0.4 + 0.5 * charge})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        const a = (e.age * 9 + i * 2.1) % TAU;
        ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.4);
        ctx.lineTo(Math.cos(a + 0.5) * r * 1.9, Math.sin(a + 0.5) * r * 1.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
};
