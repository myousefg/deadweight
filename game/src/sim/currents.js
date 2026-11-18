// Region hazards that live in the water itself. The Kelp Maze has thick patches of kelp that slow
// the boat and the fish in them; the Abyss (region 4) has drifting whirlpools that drag the boat toward a
// harmful core. Dashing breaks free of either.

import { W, H } from '../core/config.js';
import { TAU } from '../core/math.js';
import { regionIndexOf, isBossWave } from '../data/regions.js';

const KELP_SLOW_BOAT = 0.55;
const KELP_SLOW_FISH = 0.62;

/** Hazards for the wave about to begin, placed away from the boat. */
export function createZones(world, wave) {
  const region = regionIndexOf(wave);
  const boss = isBossWave(wave);
  const { rng, boat } = world;
  const zones = [];
  const place = (radius) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const x = rng.range(radius + 60, W - radius - 60);
      const y = rng.range(radius + 170, H - radius - 40);
      if (Math.hypot(x - boat.x, y - boat.y) > radius + 150) return { x, y };
    }
    return { x: rng.range(200, W - 200), y: rng.range(300, H - 100) };
  };

  if (region === 2) {
    for (let i = 0; i < (boss ? 3 : 5); i += 1) {
      const radius = rng.range(95, 135);
      const at = place(radius);
      const blades = Array.from({ length: 26 }, () => {
        const angle = rng.range(0, TAU);
        const spread = Math.sqrt(rng.next()) * radius * 0.88;
        return {
          ox: Math.cos(angle) * spread,
          oy: Math.sin(angle) * spread,
          length: rng.range(42, 78),
          phase: rng.range(0, TAU),
          lean: rng.range(-0.5, 0.5),
          shade: rng.int(0, 2),
        };
      });
      zones.push({ kind: 'kelp', x: at.x, y: at.y, r: radius, blades });
    }
  }
  if (region === 4 && !boss) {
    for (let i = 0; i < 2; i += 1) {
      const at = place(160);
      zones.push({
        kind: 'whirl', x: at.x, y: at.y, r: 165, core: 30,
        vx: rng.range(-26, 26), vy: rng.range(-20, 20), spin: rng.range(0, TAU),
      });
    }
  }
  return zones;
}

export function insideKelp(zones, x, y) {
  return zones.some((zone) => zone.kind === 'kelp' && Math.hypot(x - zone.x, y - zone.y) < zone.r);
}

/** Slow factor for fish at a point (1 outside kelp). */
export function fishSlow(zones, x, y) {
  return insideKelp(zones, x, y) ? KELP_SLOW_FISH : 1;
}

export function updateZones(world, dt) {
  const { boat, zones } = world;
  world.boatSlow = insideKelp(zones, boat.x, boat.y) ? KELP_SLOW_BOAT : 1;

  for (const zone of zones) {
    if (zone.kind !== 'whirl') continue;
    zone.x += zone.vx * dt;
    zone.y += zone.vy * dt;
    zone.spin += dt * 1.8;
    if (zone.x < 160 || zone.x > W - 160) zone.vx *= -1;
    if (zone.y < 240 || zone.y > H - 120) zone.vy *= -1;

    const dx = zone.x - boat.x;
    const dy = zone.y - boat.y;
    const gap = Math.hypot(dx, dy) || 1;
    if (gap < zone.r && !boat.sinking && boat.dashTimer <= 0) {
      const strength = 1 - gap / zone.r;
      const pull = (200 + 520 * strength) * strength;
      boat.vx += (dx / gap) * pull * dt + (-dy / gap) * 150 * strength * dt;
      boat.vy += (dy / gap) * pull * dt + (dx / gap) * 150 * strength * dt;
    }
    if (gap < zone.core && !boat.sinking) world.hurtBoat(1, zone.x, zone.y);

    for (const pickup of world.pickups) {
      const px = zone.x - pickup.x;
      const py = zone.y - pickup.y;
      const pg = Math.hypot(px, py) || 1;
      if (pg < zone.r) {
        const strength = 1 - pg / zone.r;
        pickup.vx += (px / pg) * 260 * strength * dt;
        pickup.vy += (py / pg) * 260 * strength * dt;
      }
    }
  }
}

/** Kelp and whirlpools sit under creatures and the boat but over the sea. */
export function drawZones(ctx, world) {
  const t = world.time;
  for (const zone of world.zones) {
    if (zone.kind === 'kelp') drawKelp(ctx, zone, t);
    else drawWhirlpool(ctx, zone, t);
  }
}

const KELP_COLORS = ['#2f9e5a', '#3fbf6e', '#1f7a48'];

function drawKelp(ctx, zone, t) {
  ctx.save();
  const mat = ctx.createRadialGradient(zone.x, zone.y, 8, zone.x, zone.y, zone.r);
  mat.addColorStop(0, 'rgba(20, 90, 55, 0.55)');
  mat.addColorStop(0.8, 'rgba(20, 90, 55, 0.3)');
  mat.addColorStop(1, 'rgba(20, 90, 55, 0)');
  ctx.fillStyle = mat;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.r, 0, TAU);
  ctx.fill();
  ctx.lineCap = 'round';
  for (const blade of zone.blades) {
    const baseX = zone.x + blade.ox;
    const baseY = zone.y + blade.oy;
    const sway = Math.sin(t * 1.3 + blade.phase) * 14 + blade.lean * 20;
    ctx.strokeStyle = KELP_COLORS[blade.shade];
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + sway * 0.5, baseY - blade.length * 0.55, baseX + sway, baseY - blade.length);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190, 255, 200, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawWhirlpool(ctx, zone, t) {
  ctx.save();
  ctx.translate(zone.x, zone.y);
  const well = ctx.createRadialGradient(0, 0, 4, 0, 0, zone.r);
  well.addColorStop(0, 'rgba(2, 6, 24, 0.9)');
  well.addColorStop(0.35, 'rgba(8, 20, 70, 0.55)');
  well.addColorStop(1, 'rgba(20, 50, 140, 0)');
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.arc(0, 0, zone.r, 0, TAU);
  ctx.fill();
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 4; arm += 1) {
    ctx.beginPath();
    for (let step = 0; step <= 40; step += 1) {
      const u = step / 40;
      const radius = zone.r * (0.12 + 0.88 * u);
      const angle = zone.spin + (arm / 4) * TAU + u * 3.2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(160, 200, 255, ${0.5 - arm * 0.05})`;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, zone.core, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}
