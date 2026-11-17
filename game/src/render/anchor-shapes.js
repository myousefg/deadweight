// The four anchor silhouettes, drawn upright around the origin (about 22 units each way). The
// in-game anchor spins and scales them; the dock draws them still, as a preview.

import { PALETTE } from '../config.js';
import { TAU } from '../math.js';

const OUTLINE = '#1d2a31';

function steel(ctx) {
  const metal = ctx.createLinearGradient(-18, -18, 18, 18);
  metal.addColorStop(0, '#e6f0f5');
  metal.addColorStop(0.5, PALETTE.steel);
  metal.addColorStop(1, '#6f8794');
  return metal;
}

/** Stroke the same path twice: a dark outline, then the lit metal on top. */
function metalStroke(ctx, outlineWidth, width, tracePath) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = outlineWidth;
  ctx.beginPath();
  tracePath();
  ctx.stroke();
  ctx.strokeStyle = steel(ctx);
  ctx.lineWidth = width;
  ctx.beginPath();
  tracePath();
  ctx.stroke();
}

const SHAPES = {
  ship(ctx) {
    const trace = () => {
      ctx.moveTo(-17, 3);
      ctx.quadraticCurveTo(-14, 18, 0, 19);
      ctx.quadraticCurveTo(14, 18, 17, 3);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 17);
      ctx.moveTo(-10, -7);
      ctx.lineTo(10, -7);
    };
    metalStroke(ctx, 9, 5.4, trace);
    metalStroke(ctx, 9, 3.4, () => ctx.arc(0, -17, 4.8, 0, TAU));
    ctx.fillStyle = steel(ctx);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 17, 3);
      ctx.lineTo(side * 24, -3);
      ctx.lineTo(side * 11, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  },

  grapnel(ctx) {
    const prongs = () => {
      for (const side of [-1, 1]) {
        ctx.moveTo(0, 8);
        ctx.quadraticCurveTo(side * 6, 20, side * 17, 12);
        ctx.moveTo(0, 8);
        ctx.quadraticCurveTo(side * 10, 2, side * 19, -8);
      }
    };
    metalStroke(ctx, 8, 4.2, () => {
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 9);
      prongs();
    });
    metalStroke(ctx, 8, 3, () => ctx.arc(0, -16, 4.2, 0, TAU));
    ctx.fillStyle = steel(ctx);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    for (const [x, y, dx, dy] of [[-17, 12, -4, -6], [17, 12, 4, -6], [-19, -8, -5, -5], [19, -8, 5, -5]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
      ctx.lineTo(x + dx * 0.2, y + dy * 1.4 + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  },

  mace(ctx) {
    ctx.fillStyle = OUTLINE;
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.2) * 11, Math.sin(a - 0.2) * 11);
      ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
      ctx.lineTo(Math.cos(a + 0.2) * 11, Math.sin(a + 0.2) * 11);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = steel(ctx);
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.15) * 11, Math.sin(a - 0.15) * 11);
      ctx.lineTo(Math.cos(a) * 21.5, Math.sin(a) * 21.5);
      ctx.lineTo(Math.cos(a + 0.15) * 11, Math.sin(a + 0.15) * 11);
      ctx.closePath();
      ctx.fill();
    }
    const ball = ctx.createRadialGradient(-4, -5, 2, 0, 0, 14);
    ball.addColorStop(0, '#8d9aa5');
    ball.addColorStop(1, '#2c353d');
    ctx.fillStyle = ball;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.fillStyle = '#d6e3ea';
    for (const [x, y] of [[-5, -5], [5, -4], [0, 5], [-6, 4], [6, 5]]) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, TAU);
      ctx.fill();
    }
    metalStroke(ctx, 8, 3.4, () => ctx.arc(0, -17, 4, 0, TAU));
  },

  lantern(ctx, time) {
    const flicker = 0.85 + 0.15 * Math.sin(time * 17) + 0.05 * Math.sin(time * 41);
    metalStroke(ctx, 8, 3, () => ctx.arc(0, -19, 4.4, 0, TAU));
    ctx.fillStyle = '#c9953c';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, -12);
    ctx.lineTo(9, -12);
    ctx.lineTo(13, -6);
    ctx.lineTo(-13, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const glass = ctx.createLinearGradient(0, -6, 0, 14);
    glass.addColorStop(0, `rgba(255, 236, 150, ${flicker})`);
    glass.addColorStop(1, `rgba(255, 150, 60, ${flicker})`);
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.rect(-12, -6, 24, 20);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(-4, 14);
    ctx.moveTo(4, -6);
    ctx.lineTo(4, 14);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 255, 230, ${flicker})`;
    ctx.beginPath();
    ctx.ellipse(0, 4, 3.4, 6.5 * flicker, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9953c';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, 14);
    ctx.lineTo(14, 14);
    ctx.lineTo(10, 20);
    ctx.lineTo(-10, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
};

export function drawAnchorShape(ctx, kind, time = 0) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  (SHAPES[kind] || SHAPES.ship)(ctx, time);
  ctx.restore();
}
