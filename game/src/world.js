// The simulation: one World holds the boat, anchor, creatures, pickups and effects, runs the wave
// state machine (intro, fight, cleared, won, lost) and draws everything in the right order.
// Rules of contact live in combat.js; this file wires the pieces and keeps the clock.

import { PALETTE, W, H } from './config.js';
import { createRng } from './random.js';
import { audio } from './audio.js';
import { Particles } from './particles.js';
import { Effects } from './effects.js';
import { Boat } from './boat.js';
import { Anchor } from './anchor.js';
import { createBuild } from './upgrades.js';
import { applyAnchorType } from './anchor-types.js';
import { createEnemy, drawEnemy } from './enemy.js';
import { ENEMY_TYPES } from './enemies/index.js';
import { WaveDirector, FINAL_WAVE, waveDef } from './waves.js';
import { regionOf, isBossWave, isRegionStart, lapOf } from './regions.js';
import { applyTalents } from './talents.js';
import { updateContract, resolveContract } from './contracts.js';
import { createMines, updateMines, drawMines } from './mines.js';
import { updateProjectiles, drawProjectiles } from './projectiles.js';
import { updatePickups, drawPickups } from './pickups.js';
import { updateHazards, drawHazardTelegraphs, drawHazardTentacles } from './hazards.js';
import { createZones, updateZones, drawZones, fishSlow } from './currents.js';
import * as combat from './combat.js';
import { drawSea } from './render/sea.js';
import { drawBoat } from './render/boat-art.js';
import { drawChainAndAnchor } from './render/anchor-art.js';
import { drawSurgeRing, drawZaps, drawFinale } from './render/overlays.js';

const INTRO_TIME = 2.4;
const NO_CONTROLS = { moveX: 0, moveY: 0, aimX: W / 2, aimY: H / 2, slam: false, surge: false, dash: false };

export class World {
  constructor({ seed = 1, attract = false, anchorKind = 'ship', talents = {}, endless = false } = {}) {
    this.seed = seed;
    this.attract = attract;
    this.anchorKind = anchorKind;
    this.endless = endless;
    this.rng = createRng(seed);
    this.particles = new Particles();
    this.effects = new Effects();
    this.build = createBuild();
    applyAnchorType(this.build, anchorKind);
    this.boat = new Boat();
    this.anchor = new Anchor(this.boat);
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.hazards = [];
    this.zones = [];
    this.mines = [];
    this.zaps = [];
    this.director = new WaveDirector(this);
    this.stats = {
      score: 0, kills: 0, bosses: 0, pearls: 0, damage: 0, hits: 0, slams: 0, surges: 0, reflected: 0, bestCombo: 0, time: 0,
      mines: 0, contracts: 0, contractSalvage: 0, cleanRegions: 0, stormClears: 0, bossIds: [],
    };
    this.combo = { count: 0, timer: 0 };
    /** Pearls available to spend at the harbor (stats.pearls counts every one ever caught). */
    this.purse = 0;
    this.tide = 0;
    this.surge = null;
    this.surgeCounter = 0;
    this.wave = 0;
    this.state = 'idle';
    this.stateTimer = 0;
    this.banner = null;
    this.speedScale = 1;
    this.stormy = false;
    this.boatSlow = 1;
    this.godMode = false;
    this.time = 0;
    this.finale = null;
    this.vacuum = false;
    this.hitsAtWaveStart = 0;
    /** True once only stragglers remain: ranged fish then close in instead of keeping their distance. */
    this.hunt = false;
    this.huntTimer = 0;
    /** Boss health grows by lap in the Deep Dive. */
    this.bossScale = 1;
    this.tideHead = 0;
    this.freeReroll = 0;
    this.stormBonus = 0;
    this.hitsAtRegionStart = 0;
    /** The bounty contract being worked on in this region, or null. */
    this.contract = null;
    applyTalents(this, talents);
  }

  /** Health for a boss with this base value: stormy seas and later Deep Dive laps make it tougher. */
  bossHp(base) {
    return Math.round(base * (this.stormy ? 1.15 : 1) * this.bossScale);
  }

  /** The region the current (or upcoming) wave is in. */
  get region() {
    return regionOf(this.wave);
  }

  /* ------------------------------------------------------------ lifecycle */

  startWave(wave) {
    const def = waveDef(wave);
    this.wave = wave;
    this.bossScale = 1 + 0.55 * lapOf(wave);
    if (isRegionStart(wave)) this.hitsAtRegionStart = this.stats.hits;
    if (this.tide < this.tideHead) this.tide = this.tideHead;
    this.state = 'intro';
    this.stateTimer = 0;
    this.speedScale = 1 + 0.035 * (wave - 1);
    this.vacuum = false;
    this.hitsAtWaveStart = this.stats.hits;
    this.zones = createZones(this, wave);
    this.mines = createMines(this, wave);
    this.hazards.length = 0;
    this.director.begin(wave);
    const boss = def.boss ? ENEMY_TYPES[def.boss] : null;
    this.banner = {
      title: boss ? boss.name.toUpperCase() : `WAVE ${wave}`,
      sub: boss ? `Boss of the ${this.region.name}` : lapOf(wave) > 0 ? `${def.name} · Lap ${lapOf(wave) + 1}` : def.name,
      hint: def.hint,
      t: 0,
      dur: INTRO_TIME + 0.4,
    };
    audio.play('wave');
    audio.setIntensity(Math.min(1, wave / FINAL_WAVE));
  }

  spawnEnemy(type, x, y) {
    const def = ENEMY_TYPES[type];
    const enemy = createEnemy(def, x, y, this.rng);
    def.init?.(enemy, this);
    this.enemies.push(enemy);
    return enemy;
  }

  /** Called when a region's boss dies: its minions vanish and the sea is the player's. */
  bossDown(x, y) {
    for (const enemy of this.enemies) {
      if (!enemy.boss && !enemy.dead) {
        enemy.dead = true;
        this.particles.splash(enemy.x, enemy.y, 10, PALETTE.foam, 260);
      }
    }
    this.projectiles.length = 0;
    this.hazards.length = 0;
    for (const mine of this.mines) this.particles.splash(mine.x, mine.y, 8, PALETTE.foam, 200);
    this.mines.length = 0;
    this.effects.addShake(22);
    this.effects.flash = 0.8;
    this.effects.stop(0.15);
    this.effects.popup('BOSS DEFEATED!', W / 2, H * 0.4, { color: PALETTE.gold, size: 54, life: 2, rise: 30 });
    for (let i = 0; i < 6; i += 1) {
      this.particles.splash(x + (Math.random() - 0.5) * 160, y + (Math.random() - 0.5) * 120, 22, PALETTE.gold, 460);
    }
    this.particles.confetti(x, y, 50);
    audio.play('clear');
  }

  /** Called when the Kraken dies: the run is won, the sea goes quiet and fireworks begin. */
  beginFinale(x, y) {
    if (this.endless) {
      // The Deep Dive has no last boss: the Kraken falls like any other and the sea goes on.
      this.bossDown(x, y);
      return;
    }
    this.regionDone();
    this.state = 'won';
    this.stateTimer = 0;
    this.finale = { x, y, t: 0, next: 0, confetti: false };
    for (const enemy of this.enemies) {
      if (!enemy.boss && !enemy.dead) {
        enemy.dead = true;
        this.particles.splash(enemy.x, enemy.y, 10, PALETTE.foam, 260);
      }
    }
    this.projectiles.length = 0;
    this.hazards.length = 0;
    this.effects.addShake(26);
    this.effects.flash = 1;
    this.effects.stop(0.2);
    audio.play('win');
    audio.setIntensity(0.1);
  }

  /** A region's boss is down: tally clean and stormy clears and judge the region's contract. */
  regionDone() {
    if (this.stats.hits === this.hitsAtRegionStart) this.stats.cleanRegions += 1;
    if (this.stormy) this.stats.stormClears += 1;
    resolveContract(this);
  }

  /* ------------------------------------------------- helpers entities call */

  hurtBoat(amount, x, y) { return combat.hurtBoat(this, amount, x, y); }
  healBoat(amount, x, y) { return combat.healBoat(this, amount, x, y); }
  collectPearl(pearl) { return combat.collectPearl(this, pearl); }
  damageEnemy(enemy, amount, dx, dy, knock, info) { return combat.damageEnemy(this, enemy, amount, dx, dy, knock, info); }

  /* --------------------------------------------------------------- update */

  update(dt, controls = NO_CONTROLS) {
    this.effects.update(dt);
    this.particles.update(dt);
    if (this.effects.hitStop > 0) {
      this.effects.hitStop -= dt;
      return;
    }
    this.time += dt;
    this.stateTimer += dt;
    if (this.state === 'intro' || this.state === 'fight') this.stats.time += dt;

    const lost = this.state === 'lost';
    const ctl = lost ? { ...NO_CONTROLS, aimX: this.anchor.x, aimY: this.anchor.y } : controls;
    updateZones(this, dt);
    this.boat.update(dt, ctl, this.build, this);
    this.anchor.update(dt, this.boat, ctl, this.build, this);
    if (this.anchor.pendingImpact) combat.slamImpact(this, this.anchor.x, this.anchor.y);
    if (ctl.surge) combat.tryStartSurge(this);
    combat.updateSurge(this, dt);

    this.updateWaveState(dt);
    this.updateEnemies(dt);
    updateProjectiles(this, dt);
    updateHazards(this, dt);
    updateMines(this, dt);
    combat.resolveAnchor(this);
    combat.resolveFriendlyProjectiles(this);
    combat.resolveBoat(this);
    updatePickups(this, dt);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);

    this.combo.timer = Math.max(0, this.combo.timer - dt);
    if (this.combo.timer === 0) this.combo.count = 0;
    for (let i = this.zaps.length - 1; i >= 0; i -= 1) {
      this.zaps[i].life -= dt;
      if (this.zaps[i].life <= 0) this.zaps.splice(i, 1);
    }
    this.updateFinale(dt);
    updateContract(this);

    audio.setSwing(Math.min(1, this.anchor.speed / 1300));
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }
  }

  updateWaveState(dt) {
    if (this.state === 'intro') {
      if (this.stateTimer >= INTRO_TIME) {
        this.state = 'fight';
        this.stateTimer = 0;
      }
    } else if (this.state === 'fight') {
      this.director.update(dt);
      // When only stragglers are left and nothing more will spawn, they stop hanging back.
      const stragglers = this.director.schedule.length === 0 && this.enemies.length > 0 && !isBossWave(this.wave);
      this.huntTimer = stragglers ? this.huntTimer + dt : 0;
      this.hunt = this.huntTimer > 8;
      if ((this.endless || this.wave < FINAL_WAVE) && this.director.cleared) this.clearWave();
    }
  }

  clearWave() {
    this.state = 'cleared';
    this.stateTimer = 0;
    this.vacuum = true;
    const boss = isBossWave(this.wave);
    if (boss) this.regionDone();
    const flawless = this.stats.hits === this.hitsAtWaveStart;
    const bonus = 250 * this.wave + (flawless ? 500 : 0) + (boss ? 1000 : 0);
    this.stats.score += bonus;
    this.banner = {
      title: boss ? 'REGION CLEARED' : 'WAVE CLEARED',
      sub: flawless ? `Flawless! +${bonus} bonus` : `+${bonus} bonus`,
      hint: '',
      t: 0,
      dur: 2.2,
    };
    audio.play('clear');
    this.effects.addShake(5);
    this.particles.ring(this.boat.x, this.boat.y, 20, 260, 0.7, PALETTE.gold, 6);
    for (const projectile of this.projectiles) {
      if (!projectile.friendly) {
        projectile.dead = true;
        this.particles.sparks(projectile.x, projectile.y, 0, 6.28, 4, PALETTE.foam, 180);
      }
    }
  }

  updateEnemies(dt) {
    const list = this.enemies;
    for (const e of list) {
      if (e.dead) continue;
      e.age += dt;
      e.hitCd = Math.max(0, e.hitCd - dt);
      e.flash = Math.max(0, e.flash - dt);
      e.def.update(e, this, dt);
      if (!e.boss) {
        const slow = fishSlow(this.zones, e.x, e.y);
        e.vx *= slow;
        e.vy *= slow;
      }
      e.x += (e.vx + e.kx) * dt;
      e.y += (e.vy + e.ky) * dt;
      const decay = Math.exp(-5.5 * dt);
      e.kx *= decay;
      e.ky *= decay;
    }
    for (let i = 0; i < list.length; i += 1) {
      const a = list[i];
      if (a.boss) continue;
      for (let j = i + 1; j < list.length; j += 1) {
        const b = list[j];
        if (b.boss) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const gap = Math.hypot(dx, dy);
        const min = (a.r + b.r) * 0.85;
        if (gap > 0.001 && gap < min) {
          const push = (min - gap) * 0.5;
          a.x -= (dx / gap) * push;
          a.y -= (dy / gap) * push;
          b.x += (dx / gap) * push;
          b.y += (dy / gap) * push;
        }
      }
    }
  }

  updateFinale(dt) {
    const finale = this.finale;
    if (!finale) return;
    finale.t += dt;
    finale.next -= dt;
    if (finale.next <= 0 && finale.t < 2.4) {
      finale.next = 0.13;
      const x = finale.x + (Math.random() - 0.5) * 220;
      const y = finale.y + (Math.random() - 0.5) * 170;
      const colors = [PALETTE.gold, PALETTE.coral, PALETTE.violet, PALETTE.foam];
      this.particles.splash(x, y, 22, colors[Math.floor(Math.random() * colors.length)], 460);
      this.particles.ring(x, y, 10, 90 + Math.random() * 60, 0.5, PALETTE.gold, 5);
      this.effects.addShake(9);
      audio.play('kill', 8 + Math.floor(finale.t * 4));
    }
    if (finale.t >= 2.4 && !finale.confetti) {
      finale.confetti = true;
      this.particles.confetti(W / 2, H * 0.4, 120);
      this.particles.confetti(W * 0.2, H * 0.6, 60);
      this.particles.confetti(W * 0.8, H * 0.6, 60);
    }
  }

  /* ----------------------------------------------------------------- draw */

  draw(ctx) {
    const shake = this.effects.shakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawSea(ctx, this.time, this.region.id);
    drawZones(ctx, this);
    drawMines(ctx, this);
    drawHazardTelegraphs(ctx, this);
    drawPickups(ctx, this);
    this.particles.draw(ctx);

    const order = [...this.enemies].sort((a, b) => a.y - b.y);
    for (const enemy of order) drawEnemy(ctx, enemy, this);
    drawHazardTentacles(ctx, this);

    drawChainAndAnchor(ctx, this);
    drawBoat(ctx, this.boat, this);
    drawProjectiles(ctx, this);
    drawSurgeRing(ctx, this);
    drawZaps(ctx, this);
    drawFinale(ctx, this);

    // The title-screen demo plays silently: no floating score text over the menu.
    const popups = this.attract ? [] : this.effects.popups;
    for (const popup of popups) {
      const fraction = popup.life / popup.max;
      ctx.save();
      ctx.globalAlpha = Math.min(1, fraction * 2.2);
      ctx.font = `bold ${popup.size}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = popup.stroke;
      const y = popup.y - (1 - fraction) * popup.rise;
      ctx.strokeText(popup.text, popup.x, y);
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, popup.x, y);
      ctx.restore();
    }
    ctx.restore();

    if (this.effects.hurt > 0) {
      const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
      edge.addColorStop(0, 'rgba(232, 55, 74, 0)');
      edge.addColorStop(1, `rgba(232, 55, 74, ${0.55 * this.effects.hurt})`);
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.effects.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.8, this.effects.flash * 0.7)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
