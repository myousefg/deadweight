// Pooled particles: water droplets, sparks, bubbles, foam blobs, expanding rings and confetti.
// One list, one update loop and one draw loop; the kind decides how each particle looks.

import { PALETTE } from '../core/config.js';
import { TAU } from '../core/math.js';

export class Particles {
  constructor(limit = 1100) {
    this.list = [];
    this.limit = limit;
  }

  clear() {
    this.list.length = 0;
  }

  add(particle) {
    if (this.list.length < this.limit) this.list.push(particle);
  }

  /** Water droplets thrown outward from a point. */
  splash(x, y, count, color = PALETTE.foam, speed = 220) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const v = speed * (0.35 + Math.random() * 0.8);
      this.add({
        kind: 'drop', x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        life: 0.5 + Math.random() * 0.4, max: 0.9, size: 2 + Math.random() * 4, color, drag: 3.2,
      });
    }
  }

  /** Bright sparks in a cone around `angle`. */
  sparks(x, y, angle, spread, count, color, speed = 420) {
    for (let i = 0; i < count; i += 1) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.3 + Math.random() * 0.9);
      this.add({
        kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.25 + Math.random() * 0.3, max: 0.55, size: 2 + Math.random() * 2.5, color, drag: 4.5,
      });
    }
  }

  bubble(x, y, size = 4) {
    this.add({
      kind: 'bubble', x, y, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 30,
      life: 0.8 + Math.random() * 0.9, max: 1.7, size, color: PALETTE.foam, drag: 1.2,
    });
  }

  /** A soft blob of foam that spreads and fades: wakes and impact puffs. */
  foam(x, y, size = 10, life = 0.7) {
    this.add({
      kind: 'foam', x, y, vx: (Math.random() - 0.5) * 24, vy: (Math.random() - 0.5) * 24,
      life, max: life, size, color: PALETTE.foam, drag: 2,
    });
  }

  /** An expanding outline circle. */
  ring(x, y, from, to, life, color, width = 4) {
    this.add({ kind: 'ring', x, y, vx: 0, vy: 0, life, max: life, size: from, size2: to, color, width, drag: 0 });
  }

  confetti(x, y, count) {
    const colors = [PALETTE.gold, PALETTE.coral, PALETTE.pink, PALETTE.mint, PALETTE.foam];
    for (let i = 0; i < count; i += 1) {
      this.add({
        kind: 'confetti', x, y, vx: (Math.random() - 0.5) * 520, vy: -200 - Math.random() * 420,
        life: 2.2 + Math.random() * 1.4, max: 3.6, size: 5 + Math.random() * 5, color: colors[i % colors.length],
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 12, drag: 0.9, gravity: 520,
      });
    }
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      const slow = Math.exp(-p.drag * dt);
      p.vx *= slow;
      p.vy *= slow;
      if (p.gravity) p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.spin) p.rot += p.spin * dt;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const fraction = p.life / p.max;
      switch (p.kind) {
        case 'drop':
        case 'spark':
          ctx.globalAlpha = Math.min(1, fraction * 1.6);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.kind === 'spark' ? fraction + 0.3 : 1), 0, TAU);
          ctx.fill();
          break;
        case 'bubble':
          ctx.globalAlpha = fraction * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.3 - fraction * 0.3), 0, TAU);
          ctx.stroke();
          break;
        case 'foam':
          ctx.globalAlpha = fraction * 0.55;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.6 - fraction * 0.6), 0, TAU);
          ctx.fill();
          break;
        case 'ring': {
          const grow = 1 - fraction;
          const eased = 1 - (1 - grow) * (1 - grow);
          ctx.globalAlpha = fraction;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.width * (0.4 + fraction * 0.8);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + (p.size2 - p.size) * eased, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'confetti':
          ctx.globalAlpha = Math.min(1, fraction * 2);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          break;
        default:
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
