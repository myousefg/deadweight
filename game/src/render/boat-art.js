// The rowboat, seen from above: planked hull, a sailor in a red cap, swinging oars and a
// pennant that streams behind. It flickers while invulnerable and sinks when the run is lost.

import { PALETTE } from '../core/config.js';
import { TAU } from '../core/math.js';

function hullPath(ctx, scale) {
  ctx.beginPath();
  ctx.moveTo(32 * scale, 0);
  ctx.bezierCurveTo(20 * scale, -17 * scale, -10 * scale, -18 * scale, -27 * scale, -12 * scale);
  ctx.lineTo(-30 * scale, 0);
  ctx.lineTo(-27 * scale, 12 * scale);
  ctx.bezierCurveTo(-10 * scale, 18 * scale, 20 * scale, 17 * scale, 32 * scale, 0);
  ctx.closePath();
}

export function drawBoat(ctx, boat, world) {
  const sink = boat.sinking ? Math.min(1, boat.sinkTime / 2) : 0;
  if (sink >= 1) return;

  let alpha = 1 - sink;
  if (boat.invuln > 0 && boat.dashTimer <= 0 && !world.surge && !boat.sinking) {
    alpha *= Math.floor(world.time * 22) % 2 ? 0.35 : 1;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(2, 22, 32, 0.3)';
  ctx.beginPath();
  ctx.ellipse(boat.x + 6, boat.y + 13, 44, 23, boat.heading, 0, TAU);
  ctx.fill();

  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.heading);
  const scale = (1 - sink * 0.5) * (boat.dashTimer > 0 ? 1.12 : 1) * 1.28;
  ctx.scale(scale, boat.dashTimer > 0 ? scale * 0.9 : scale);

  const sway = Math.sin(boat.oar);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const angle = 0.5 * sway * side * -1;
    const startX = 1;
    const startY = side * 11;
    const endX = startX + Math.sin(angle) * 34;
    const endY = startY + side * Math.cos(angle) * 34;
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.fillStyle = '#c98b55';
    ctx.beginPath();
    ctx.ellipse(endX, endY + side * 3, 4, 7, -side * angle, 0, TAU);
    ctx.fill();
  }

  const planks = ctx.createLinearGradient(0, -18, 0, 18);
  planks.addColorStop(0, '#c98150');
  planks.addColorStop(0.5, PALETTE.wood);
  planks.addColorStop(1, '#8f5a2f');
  hullPath(ctx, 1);
  ctx.fillStyle = planks;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.stroke();

  hullPath(ctx, 0.78);
  ctx.fillStyle = '#e7bd85';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(111, 64, 35, 0.6)';
  ctx.stroke();
  ctx.beginPath();
  for (let x = -20; x <= 22; x += 7) {
    ctx.moveTo(x, -9 + Math.abs(x) * 0.06);
    ctx.lineTo(x, 9 - Math.abs(x) * 0.06);
  }
  ctx.stroke();

  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(-7, -12, 5, 24);

  ctx.fillStyle = '#2e6fb3';
  ctx.beginPath();
  ctx.ellipse(2, 0, 6.5, 10.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -10, 2.2, 20);
  ctx.fillStyle = '#f2c79d';
  ctx.beginPath();
  ctx.arc(5, 0, 6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.arc(4.5, 0, 6.2, Math.PI * 0.55, Math.PI * 1.45, true);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-1.5, 0, 2.4, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const flap = Math.sin(world.time * 9) * 3;
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-40, -4 + flap);
  ctx.lineTo(-38, 3 + flap);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-27, 0);
  ctx.lineTo(-21, 0);
  ctx.stroke();
  ctx.restore();
}
