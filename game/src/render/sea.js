// The sea background. A static layer (gradient, light pools, rocky corners, vignette) is painted
// once; every frame adds drifting caustics, rolling wave lines, foam flecks and surf on the rocks.

import { W, H } from '../config.js';
import { TAU } from '../math.js';
import { createRng } from '../random.js';

const PAD = 20;
const WAVE_LINES = 15;

/** Rocky islets that frame the arena (clear of the HUD): centre and radius in screen coordinates. */
const ROCKS = [
  { x: 46, y: 676, r: 70 },
  { x: 1236, y: 690, r: 84 },
  { x: -18, y: 372, r: 62 },
  { x: 1296, y: 380, r: 70 },
];

let staticLayer = null;
let causticLayer = null;
let flecks = [];

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintStatic() {
  const rng = createRng(7);
  const canvas = makeCanvas(W + PAD * 2, H + PAD * 2);
  const g = canvas.getContext('2d');
  g.translate(PAD, PAD);

  const base = g.createLinearGradient(0, -PAD, 0, H + PAD);
  base.addColorStop(0, '#12828c');
  base.addColorStop(0.5, '#0b6678');
  base.addColorStop(1, '#073f52');
  g.fillStyle = base;
  g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);

  for (let i = 0; i < 16; i += 1) {
    const x = rng.range(0, W);
    const y = rng.range(0, H);
    const radius = rng.range(120, 280);
    const pool = g.createRadialGradient(x, y, 0, x, y, radius);
    const light = i % 3 !== 0;
    pool.addColorStop(0, light ? 'rgba(130, 235, 225, 0.12)' : 'rgba(2, 28, 42, 0.2)');
    pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = pool;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (const rock of ROCKS) {
    // Shallow turquoise water, then a pale sandy rim, then the weathered rocks themselves.
    const shallows = g.createRadialGradient(rock.x, rock.y, rock.r * 0.9, rock.x, rock.y, rock.r * 1.9);
    shallows.addColorStop(0, 'rgba(120, 240, 220, 0.6)');
    shallows.addColorStop(1, 'rgba(120, 240, 220, 0)');
    g.fillStyle = shallows;
    g.beginPath();
    g.arc(rock.x, rock.y, rock.r * 1.9, 0, TAU);
    g.fill();
    g.fillStyle = '#e9d29a';
    g.beginPath();
    g.arc(rock.x, rock.y, rock.r * 1.12, 0, TAU);
    g.fill();
    for (let k = 0; k < 5; k += 1) {
      const angle = rng.range(0, TAU);
      const spread = rock.r * rng.range(0.15, 0.55);
      const ox = Math.cos(angle) * spread;
      const oy = Math.sin(angle) * spread;
      const radius = rock.r * rng.range(0.32, 0.5);
      const stone = g.createRadialGradient(rock.x + ox - radius * 0.35, rock.y + oy - radius * 0.35, 2, rock.x + ox, rock.y + oy, radius);
      stone.addColorStop(0, '#d8c9a8');
      stone.addColorStop(0.55, '#9a8668');
      stone.addColorStop(1, '#5e4d3a');
      g.fillStyle = stone;
      g.beginPath();
      g.arc(rock.x + ox, rock.y + oy, radius, 0, TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(111, 200, 120, 0.55)';
    for (let k = 0; k < 6; k += 1) {
      g.beginPath();
      g.arc(rock.x + rng.range(-0.45, 0.45) * rock.r, rock.y + rng.range(-0.45, 0.45) * rock.r, rng.range(3, 8), 0, TAU);
      g.fill();
    }
  }

  const vignette = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.05);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 18, 28, 0.6)');
  g.fillStyle = vignette;
  g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
  return canvas;
}

function paintCaustics() {
  const rng = createRng(21);
  const canvas = makeCanvas(W + 200, H + 200);
  const g = canvas.getContext('2d');
  g.lineWidth = 2.2;
  for (let i = 0; i < 190; i += 1) {
    const x = rng.range(0, canvas.width);
    const y = rng.range(0, canvas.height);
    const rx = rng.range(14, 46);
    const ry = rx * rng.range(0.4, 0.9);
    g.strokeStyle = `rgba(200, 255, 245, ${rng.range(0.1, 0.38)})`;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rng.range(0, Math.PI), 0, TAU);
    g.stroke();
    if (i % 4 === 0) {
      const glow = g.createRadialGradient(x, y, 0, x, y, rx * 1.4);
      glow.addColorStop(0, 'rgba(210, 255, 248, 0.4)');
      glow.addColorStop(1, 'rgba(210, 255, 248, 0)');
      g.fillStyle = glow;
      g.fillRect(x - rx * 1.4, y - rx * 1.4, rx * 2.8, rx * 2.8);
    }
  }
  return canvas;
}

function init() {
  const rng = createRng(33);
  staticLayer = paintStatic();
  causticLayer = paintCaustics();
  flecks = Array.from({ length: 46 }, () => ({
    x: rng.range(0, W),
    y: rng.range(0, H),
    size: rng.range(6, 16),
    speed: rng.range(0.6, 1.6),
    offset: rng.range(0, TAU),
  }));
}

export function drawSea(ctx, time) {
  if (!staticLayer) init();
  ctx.drawImage(staticLayer, -PAD, -PAD);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.14;
  ctx.drawImage(causticLayer, -60 + Math.sin(time * 0.25) * 40, -60 + Math.cos(time * 0.21) * 30);
  ctx.globalAlpha = 0.1;
  ctx.drawImage(causticLayer, -140 - Math.cos(time * 0.19) * 50, -100 + Math.sin(time * 0.23) * 35);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < WAVE_LINES; i += 1) {
    const baseY = 26 + i * (H / WAVE_LINES);
    ctx.strokeStyle = `rgba(234, 252, 247, ${0.05 + 0.045 * Math.sin(i * 2.1 + time * 0.7)})`;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 40) {
      const y = baseY + Math.sin(x * 0.012 + time * 0.9 + i * 1.7) * 7 + Math.sin(x * 0.031 - time * 0.6 + i) * 3;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(234, 252, 247, 1)';
  ctx.lineWidth = 2;
  for (const fleck of flecks) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * fleck.speed + fleck.offset);
    ctx.globalAlpha = 0.07 + 0.2 * twinkle * twinkle;
    ctx.beginPath();
    ctx.moveTo(fleck.x - fleck.size / 2, fleck.y);
    ctx.lineTo(fleck.x + fleck.size / 2, fleck.y);
    ctx.stroke();
  }

  ctx.lineWidth = 3;
  for (const rock of ROCKS) {
    for (let k = 0; k < 2; k += 1) {
      const swell = (time * 0.5 + k * 0.5) % 1;
      ctx.globalAlpha = 0.5 * (1 - swell);
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, rock.r * (0.95 + swell * 0.55), 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}
