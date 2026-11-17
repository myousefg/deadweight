// What every enemy has in common: creation, the shared body fields, and the wrapper that draws a
// shadow, the type's own art, a white hit flash and a small health bar. Each kind lives in its
// own file under enemies/ and supplies update() and draw().

import { TAU } from './math.js';

export function createEnemy(def, x, y, rng) {
  return {
    def,
    id: def.id,
    x,
    y,
    vx: 0,
    vy: 0,
    /** Knockback velocity, decays on its own. */
    kx: 0,
    ky: 0,
    r: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    hitCd: 0,
    flash: 0,
    age: 0,
    dead: false,
    heading: rng.range(0, TAU),
    phase: rng.range(0, TAU),
    state: 'idle',
    timer: 0,
    stun: 0,
    surgeId: 0,
    boss: !!def.boss,
  };
}

export function drawEnemy(ctx, enemy, world) {
  const { def } = enemy;
  ctx.save();
  ctx.fillStyle = 'rgba(2, 22, 32, 0.28)';
  ctx.beginPath();
  ctx.ellipse(enemy.x + 5, enemy.y + 11, enemy.r * 0.95, enemy.r * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  def.draw(ctx, enemy, world);

  if (enemy.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, enemy.flash * 5);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r * 0.92, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  if (!enemy.boss && enemy.hp < enemy.maxHp && enemy.maxHp > 1) {
    const width = Math.max(30, enemy.r * 1.6);
    const x = enemy.x - width / 2;
    const y = enemy.y - enemy.r - 16;
    ctx.save();
    ctx.fillStyle = 'rgba(2, 22, 32, 0.7)';
    ctx.fillRect(x - 1, y - 1, width + 2, 7);
    ctx.fillStyle = '#ff6b57';
    ctx.fillRect(x, y, width * Math.max(0, enemy.hp / enemy.maxHp), 5);
    ctx.restore();
  }
}
