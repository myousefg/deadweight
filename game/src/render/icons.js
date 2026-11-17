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
  skull(ctx) {
    ctx.beginPath();
    ctx.arc(0, -3, 12, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(7, 12);
    ctx.lineTo(-7, 12);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-5, -3, 3, 0, TAU);
    ctx.arc(5, -3, 3, 0, TAU);
    ctx.moveTo(-3, 12);
    ctx.lineTo(-3, 16);
    ctx.moveTo(3, 12);
    ctx.lineTo(3, 16);
    ctx.stroke();
  },
  cloud(ctx) {
    ctx.beginPath();
    ctx.moveTo(-14, 4);
    ctx.quadraticCurveTo(-18, -8, -6, -8);
    ctx.quadraticCurveTo(-2, -18, 8, -10);
    ctx.quadraticCurveTo(18, -8, 14, 4);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 5);
    ctx.lineTo(-3, 12);
    ctx.lineTo(3, 12);
    ctx.lineTo(-2, 19);
    ctx.stroke();
  },
  heart(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(-20, 2, -14, -14, 0, -6);
    ctx.bezierCurveTo(14, -14, 20, 2, 0, 14);
    ctx.stroke();
  },
  coin(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.moveTo(8, 0);
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.stroke();
  },
  star(ctx) {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 ? 6 : 15;
      const a = (i / 10) * TAU - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
  },
  medal(ctx) {
    ctx.beginPath();
    ctx.arc(0, 4, 10, 0, TAU);
    ctx.moveTo(-7, -5);
    ctx.lineTo(-10, -17);
    ctx.lineTo(-2, -12);
    ctx.moveTo(7, -5);
    ctx.lineTo(10, -17);
    ctx.lineTo(2, -12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, 9);
    ctx.stroke();
  },
  flag(ctx) {
    ctx.beginPath();
    ctx.moveTo(-9, 17);
    ctx.lineTo(-9, -16);
    ctx.lineTo(13, -9);
    ctx.lineTo(-9, 0);
    ctx.stroke();
  },
  mine(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
    }
    ctx.stroke();
  },
  fish(ctx) {
    ctx.beginPath();
    ctx.ellipse(-2, 0, 13, 8, 0, 0, TAU);
    ctx.moveTo(10, 0);
    ctx.lineTo(18, -8);
    ctx.lineTo(18, 8);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-8, -2, 1.6, 0, TAU);
    ctx.stroke();
  },
  lock(ctx) {
    ctx.strokeRect(-10, -2, 20, 15);
    ctx.beginPath();
    ctx.arc(0, -3, 7, Math.PI, 0);
    ctx.stroke();
  },
  trophy(ctx) {
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(10, -14);
    ctx.lineTo(8, 0);
    ctx.quadraticCurveTo(0, 8, -8, 0);
    ctx.closePath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, 13);
    ctx.moveTo(-7, 14);
    ctx.lineTo(7, 14);
    ctx.stroke();
  },
  compass(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, TAU);
    ctx.moveTo(0, -11);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.stroke();
  },
  boat(ctx) {
    ctx.beginPath();
    ctx.moveTo(-15, 6);
    ctx.lineTo(15, 6);
    ctx.lineTo(9, 14);
    ctx.lineTo(-9, 14);
    ctx.closePath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, -16);
    ctx.lineTo(11, 2);
    ctx.lineTo(0, 2);
    ctx.stroke();
  },
  hourglass(ctx) {
    ctx.beginPath();
    ctx.moveTo(-9, -15);
    ctx.lineTo(9, -15);
    ctx.lineTo(-9, 15);
    ctx.lineTo(9, 15);
    ctx.closePath();
    ctx.stroke();
  },
  eye(ctx) {
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.quadraticCurveTo(0, -17, 17, 0);
    ctx.quadraticCurveTo(0, 17, -17, 0);
    ctx.moveTo(5, 0);
    ctx.arc(0, 0, 5, 0, TAU);
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
