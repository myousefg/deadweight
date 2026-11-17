// Little line icons for the upgrade cards, one drawing function per upgrade `icon` name.

import { PALETTE } from '../config.js';
import { TAU } from '../math.js';

const ICONS = {
  anchor(ctx) {
    ctx.beginPath();
    ctx.arc(0, -15, 4, 0, TAU);
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 15);
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.moveTo(-15, 3);
    ctx.quadraticCurveTo(-12, 16, 0, 16);
    ctx.quadraticCurveTo(12, 16, 15, 3);
    ctx.stroke();
  },
  chain(ctx) {
    for (const [x, y, angle] of [[-9, 8, -0.7], [0, 0, -0.7], [9, -8, -0.7]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 5, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  },
  bolt(ctx) {
    ctx.beginPath();
    ctx.moveTo(4, -17);
    ctx.lineTo(-9, 3);
    ctx.lineTo(-1, 3);
    ctx.lineTo(-4, 17);
    ctx.lineTo(10, -5);
    ctx.lineTo(2, -5);
    ctx.closePath();
    ctx.stroke();
  },
  ring(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.moveTo(6, 0);
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(Math.cos((i / 4) * TAU + 0.78) * 6, Math.sin((i / 4) * TAU + 0.78) * 6);
      ctx.lineTo(Math.cos((i / 4) * TAU + 0.78) * 14, Math.sin((i / 4) * TAU + 0.78) * 14);
      ctx.stroke();
    }
  },
  wind(ctx) {
    ctx.beginPath();
    ctx.moveTo(-15, -6);
    ctx.lineTo(8, -6);
    ctx.arc(8, -11, 5, Math.PI / 2, -Math.PI, true);
    ctx.moveTo(-15, 2);
    ctx.lineTo(13, 2);
    ctx.arc(13, 8, 6, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-10, 14);
    ctx.stroke();
  },
  pearl(ctx) {
    ctx.beginPath();
    ctx.arc(0, 2, 11, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-4, -2, 3, Math.PI, Math.PI * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16, -14);
    ctx.lineTo(-11, -9);
    ctx.moveTo(16, -14);
    ctx.lineTo(11, -9);
    ctx.stroke();
  },
  wave(ctx) {
    for (const y of [-9, 1, 11]) {
      ctx.beginPath();
      ctx.moveTo(-16, y);
      ctx.bezierCurveTo(-10, y - 8, -6, y - 8, 0, y);
      ctx.bezierCurveTo(6, y + 8, 10, y + 8, 16, y);
      ctx.stroke();
    }
  },
  slam(ctx) {
    ctx.beginPath();
    ctx.arc(0, 4, 6, 0, TAU);
    ctx.moveTo(-8, 4);
    ctx.arc(0, 4, 13, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(0, -6);
    ctx.moveTo(-4, -10);
    ctx.lineTo(0, -6);
    ctx.lineTo(4, -10);
    ctx.stroke();
  },
  dash(ctx) {
    ctx.beginPath();
    ctx.moveTo(-15, -8);
    ctx.lineTo(-3, -8);
    ctx.moveTo(-17, 0);
    ctx.lineTo(1, 0);
    ctx.moveTo(-15, 8);
    ctx.lineTo(-3, 8);
    ctx.moveTo(4, -11);
    ctx.lineTo(15, 0);
    ctx.lineTo(4, 11);
    ctx.stroke();
  },
  spikes(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 9, Math.sin(angle) * 9);
      ctx.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
      ctx.stroke();
    }
  },
  shield(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(13, -10);
    ctx.lineTo(11, 4);
    ctx.quadraticCurveTo(8, 13, 0, 17);
    ctx.quadraticCurveTo(-8, 13, -11, 4);
    ctx.lineTo(-13, -10);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-1, 5);
    ctx.lineTo(7, -5);
    ctx.stroke();
  },
  storm(ctx) {
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.bezierCurveTo(-18, -4, -18, -14, -9, -14);
    ctx.bezierCurveTo(-8, -20, 4, -20, 6, -13);
    ctx.bezierCurveTo(15, -13, 16, -3, 8, -4);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.lineTo(-4, 8);
    ctx.lineTo(2, 8);
    ctx.lineTo(-3, 18);
    ctx.stroke();
  },
  crate(ctx) {
    ctx.strokeRect(-12, -10, 24, 22);
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(12, 12);
    ctx.moveTo(12, -10);
    ctx.lineTo(-12, 12);
    ctx.stroke();
  },
};

export function drawIcon(ctx, name, x, y, size, color = PALETTE.cream) {
  const draw = ICONS[name];
  if (!draw) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 36, size / 36);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  draw(ctx);
  ctx.restore();
}
