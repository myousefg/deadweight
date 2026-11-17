// The sea background, one look per region. A static layer (gradient, light pools, rocky islets,
// vignette) is painted once per region; every frame adds drifting caustics or glowing motes,
// rolling wave lines, foam flecks and surf on the rocks.

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

const LOOKS = {
  shallows: {
    sea: ['#12828c', '#0b6678', '#073f52'],
    poolLight: 'rgba(130, 235, 225, 0.12)',
    poolDark: 'rgba(2, 28, 42, 0.2)',
    vignette: 'rgba(2, 18, 28, 0.6)',
    line: '234, 252, 247',
    caustics: 1,
    shafts: false,
    motes: false,
    rock: { rim: '#e9d29a', stone: ['#d8c9a8', '#9a8668', '#5e4d3a'], moss: 'rgba(111, 200, 120, 0.55)', shallow: 'rgba(120, 240, 220, 0.6)' },
  },
  kelp: {
    sea: ['#3a9a72', '#1f6b57', '#0e3d3c'],
    poolLight: 'rgba(200, 255, 150, 0.14)',
    poolDark: 'rgba(2, 34, 28, 0.24)',
    vignette: 'rgba(3, 22, 18, 0.62)',
    line: '220, 255, 220',
    caustics: 0.8,
    shafts: true,
    motes: false,
    rock: { rim: '#c9c98a', stone: ['#b9c28a', '#7d8f5a', '#465a3a'], moss: 'rgba(70, 170, 90, 0.7)', shallow: 'rgba(150, 240, 170, 0.55)' },
  },
  abyss: {
    sea: ['#142a6a', '#0a1747', '#050a22'],
    poolLight: 'rgba(90, 130, 255, 0.12)',
    poolDark: 'rgba(0, 0, 10, 0.35)',
    vignette: 'rgba(0, 2, 12, 0.72)',
    line: '150, 190, 255',
    caustics: 0,
    shafts: false,
    motes: true,
    rock: { rim: '#2a3a6a', stone: ['#4a5a8a', '#2a3258', '#141a35'], moss: 'rgba(80, 230, 255, 0.6)', shallow: 'rgba(70, 110, 255, 0.45)' },
  },
};

const layers = {};
let causticLayer = null;
let flecks = [];
let motes = [];

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintStatic(look) {
  const rng = createRng(7);
  const canvas = makeCanvas(W + PAD * 2, H + PAD * 2);
  const g = canvas.getContext('2d');
  g.translate(PAD, PAD);

  const base = g.createLinearGradient(0, -PAD, 0, H + PAD);
  base.addColorStop(0, look.sea[0]);
  base.addColorStop(0.5, look.sea[1]);
  base.addColorStop(1, look.sea[2]);
  g.fillStyle = base;
  g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);

  for (let i = 0; i < 16; i += 1) {
    const x = rng.range(0, W);
    const y = rng.range(0, H);
    const radius = rng.range(120, 280);
    const pool = g.createRadialGradient(x, y, 0, x, y, radius);
    pool.addColorStop(0, i % 3 !== 0 ? look.poolLight : look.poolDark);
    pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = pool;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  if (look.shafts) {
    for (let i = 0; i < 5; i += 1) {
      const x = rng.range(100, W - 100);
      const width = rng.range(50, 120);
      const shaft = g.createLinearGradient(x, 0, x - 160, H);
      shaft.addColorStop(0, 'rgba(255, 255, 190, 0.1)');
      shaft.addColorStop(1, 'rgba(255, 255, 190, 0)');
      g.fillStyle = shaft;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + width, 0);
      g.lineTo(x + width - 220, H);
      g.lineTo(x - 220, H);
      g.closePath();
      g.fill();
    }
  }

  for (const rock of ROCKS) {
    const shallows = g.createRadialGradient(rock.x, rock.y, rock.r * 0.9, rock.x, rock.y, rock.r * 1.9);
    shallows.addColorStop(0, look.rock.shallow);
    shallows.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = shallows;
    g.beginPath();
    g.arc(rock.x, rock.y, rock.r * 1.9, 0, TAU);
    g.fill();
    g.fillStyle = look.rock.rim;
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
      stone.addColorStop(0, look.rock.stone[0]);
      stone.addColorStop(0.55, look.rock.stone[1]);
      stone.addColorStop(1, look.rock.stone[2]);
      g.fillStyle = stone;
      g.beginPath();
      g.arc(rock.x + ox, rock.y + oy, radius, 0, TAU);
      g.fill();
    }
    g.fillStyle = look.rock.moss;
    for (let k = 0; k < 6; k += 1) {
      g.beginPath();
      g.arc(rock.x + rng.range(-0.45, 0.45) * rock.r, rock.y + rng.range(-0.45, 0.45) * rock.r, rng.range(3, 8), 0, TAU);
      g.fill();
    }
  }

  const vignette = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.05);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, look.vignette);
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
  causticLayer = paintCaustics();
  flecks = Array.from({ length: 46 }, () => ({
    x: rng.range(0, W),
    y: rng.range(0, H),
    size: rng.range(6, 16),
    speed: rng.range(0.6, 1.6),
    offset: rng.range(0, TAU),
  }));
  const colors = ['120, 255, 235', '170, 140, 255', '255, 150, 220'];
  motes = Array.from({ length: 70 }, () => ({
    x: rng.range(0, W),
    y: rng.range(0, H),
    size: rng.range(3, 9),
    drift: rng.range(8, 22),
    sway: rng.range(10, 30),
    speed: rng.range(0.4, 1.3),
    offset: rng.range(0, TAU),
    color: colors[rng.int(0, 2)],
  }));
}

export function drawSea(ctx, time, regionId = 'shallows') {
  if (!causticLayer) init();
  const look = LOOKS[regionId] || LOOKS.shallows;
  if (!layers[regionId]) layers[regionId] = paintStatic(look);
  ctx.drawImage(layers[regionId], -PAD, -PAD);

  if (look.caustics > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14 * look.caustics;
    ctx.drawImage(causticLayer, -60 + Math.sin(time * 0.25) * 40, -60 + Math.cos(time * 0.21) * 30);
    ctx.globalAlpha = 0.1 * look.caustics;
    ctx.drawImage(causticLayer, -140 - Math.cos(time * 0.19) * 50, -100 + Math.sin(time * 0.23) * 35);
    ctx.restore();
  }

  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < WAVE_LINES; i += 1) {
    const baseY = 26 + i * (H / WAVE_LINES);
    ctx.strokeStyle = `rgba(${look.line}, ${0.05 + 0.045 * Math.sin(i * 2.1 + time * 0.7)})`;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 40) {
      const y = baseY + Math.sin(x * 0.012 + time * 0.9 + i * 1.7) * 7 + Math.sin(x * 0.031 - time * 0.6 + i) * 3;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(${look.line}, 1)`;
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

  if (look.motes) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const mote of motes) {
      const x = mote.x + Math.sin(time * 0.4 * mote.speed + mote.offset) * mote.sway;
      const y = (((mote.y - time * mote.drift) % (H + 40)) + H + 40) % (H + 40) - 20;
      const twinkle = 0.45 + 0.55 * Math.sin(time * 2 * mote.speed + mote.offset);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, mote.size * 3);
      glow.addColorStop(0, `rgba(${mote.color}, ${0.55 * twinkle})`);
      glow.addColorStop(1, `rgba(${mote.color}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - mote.size * 3, y - mote.size * 3, mote.size * 6, mote.size * 6);
    }
    ctx.restore();
  }
}
