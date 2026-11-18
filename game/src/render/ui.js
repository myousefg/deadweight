// Small canvas UI toolkit: text with outline and shadow, rounded panels and buttons.

import { FONT_BODY, FONT_TITLE, PALETTE } from '../core/config.js';

export function text(ctx, string, x, y, options = {}) {
  const {
    size = 24, weight = 'bold', color = '#ffffff', align = 'left', baseline = 'alphabetic',
    font = FONT_BODY, stroke = null, strokeWidth = 5, shadow = null, alpha = 1,
  } = options;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';
  if (shadow) {
    ctx.fillStyle = shadow.color;
    ctx.fillText(string, x + shadow.dx, y + shadow.dy);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(string, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(string, x, y);
  ctx.restore();
}

/** Big display lettering: heavy outline, a drop shadow and an optional tint. */
export function title(ctx, string, x, y, size, color = PALETTE.gold, extra = {}) {
  text(ctx, string, x, y, {
    size, color, align: 'center', font: FONT_TITLE, weight: 'normal',
    stroke: '#10222d', strokeWidth: Math.max(8, size * 0.14),
    shadow: { color: 'rgba(2, 18, 28, 0.55)', dx: 0, dy: Math.max(5, size * 0.07) },
    ...extra,
  });
}

export function measure(ctx, string, size, weight = 'bold', font = FONT_BODY) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  const width = ctx.measureText(string).width;
  ctx.restore();
  return width;
}

/** Break a string into lines no wider than `maxWidth` at the given font size. */
export function wrap(ctx, string, maxWidth, size, weight = 'normal') {
  const words = string.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (line && measure(ctx, attempt, size, weight) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = attempt;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function panel(ctx, x, y, width, height, options = {}) {
  const { fill = 'rgba(4, 35, 47, 0.84)', stroke = 'rgba(234, 252, 247, 0.4)', radius = 18, lineWidth = 2.5, shadow = true } = options;
  ctx.save();
  if (shadow) {
    ctx.fillStyle = 'rgba(0, 12, 20, 0.35)';
    roundRect(ctx, x + 4, y + 8, width, height, radius);
    ctx.fill();
  }
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  ctx.restore();
}

export function inRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

/** A button: `primary` is the gold call to action; `hover` lights it; `disabled` greys it. */
export function button(ctx, rect, label, options = {}) {
  const { hover = false, primary = false, hint = '', disabled = false, size = 28 } = options;
  const lift = hover && !disabled ? -3 : 0;
  ctx.save();
  ctx.translate(0, lift);
  ctx.fillStyle = 'rgba(0, 12, 20, 0.4)';
  roundRect(ctx, rect.x + 3, rect.y + 8 - lift, rect.w, rect.h, 16);
  ctx.fill();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
  let fill;
  if (disabled) fill = 'rgba(80, 100, 110, 0.7)';
  else if (primary) {
    fill = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    fill.addColorStop(0, hover ? '#ffe28a' : '#ffd75a');
    fill.addColorStop(1, hover ? '#ffb92e' : '#f0a51f');
  } else fill = hover ? 'rgba(42, 163, 168, 0.95)' : 'rgba(13, 101, 119, 0.92)';
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = disabled ? 'rgba(255,255,255,0.2)' : primary ? '#8a5a10' : 'rgba(234, 252, 247, 0.65)';
  ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, {
    size, align: 'center', baseline: 'middle', color: disabled ? 'rgba(255,255,255,0.5)' : primary ? '#3a2205' : '#ffffff',
  });
  if (hint) {
    text(ctx, hint, rect.x + rect.w / 2, rect.y + rect.h + 22, {
      size: 15, align: 'center', color: 'rgba(234, 252, 247, 0.8)', weight: 'normal',
    });
  }
  ctx.restore();
}

/** A small keycap label such as [SPACE]. */
export function keycap(ctx, label, x, y, options = {}) {
  const { size = 15, color = PALETTE.cream } = options;
  const width = measure(ctx, label, size) + 16;
  ctx.save();
  roundRect(ctx, x, y - size - 3, width, size + 10, 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.stroke();
  text(ctx, label, x + width / 2, y, { size, color, align: 'center' });
  ctx.restore();
  return width;
}
