// Tuning numbers, palette and fonts for Deadweight. Every balance knob lives here, so changing
// how the game feels never means touching a logic file.

export const W = 1280;
export const H = 720;
/** Fixed simulation step in seconds; the loop runs as many of these as the frame needs. */
export const STEP = 1 / 60;
export const MAX_STEPS_PER_FRAME = 6;

export const FONT_BODY = '"Trebuchet MS", "Segoe UI", Verdana, system-ui, sans-serif';
export const FONT_TITLE = 'Impact, "Arial Black", "Trebuchet MS", sans-serif';

export const PALETTE = {
  abyss: '#04232f',
  deep: '#07404f',
  sea: '#0d6577',
  shallow: '#2aa3a8',
  foam: '#eafcf7',
  sand: '#f3d79e',
  gold: '#ffc83d',
  coral: '#ff6b57',
  pink: '#ff8fc6',
  violet: '#a45cff',
  ink: '#1a1033',
  steel: '#b4c4cf',
  steelDark: '#50646f',
  wood: '#b0703c',
  woodDark: '#6f4023',
  cream: '#fff1d6',
  red: '#e8374a',
  mint: '#6ff2c5',
};

/** The rowboat the player sails. */
export const BOAT = {
  radius: 19,
  accel: 1700,
  maxSpeed: 250,
  hp: 5,
  maxHpCap: 9,
  invulnerable: 1.15,
  dashSpeed: 780,
  dashTime: 0.15,
  dashCooldown: 1.6,
  margin: 34,
};

/** The anchor on its chain: a heavy body pulled toward the cursor by a soft spring. */
export const ANCHOR = {
  radius: 17,
  rope: 235,
  spring: 150,
  damping: 12,
  maxSpeed: 1500,
  minHitSpeed: 250,
  hitCooldown: 0.2,
  slamCooldown: 1.0,
  slamSpeed: 2100,
  slamTime: 0.16,
  slamRadius: 112,
  slamDamage: 3,
};

/** Anchor speed (pixels a second) to blow strength. */
export const HIT_TIERS = [
  { min: ANCHOR.minHitSpeed, damage: 1, color: '#bff6ff', label: 'TAP' },
  { min: 600, damage: 2, color: PALETTE.gold, label: 'WHAM' },
  { min: 950, damage: 3, color: PALETTE.coral, label: 'CRUSH' },
];

/** The tide surge: a ring of water that shoves and hurts everything around the boat. */
export const SURGE = {
  radius: 440,
  time: 0.6,
  damage: 4,
  push: 560,
};

export const COMBO = {
  window: 2.4,
  /** Kills per half-step of score multiplier. */
  perStep: 3,
  maxBonus: 4,
};

export const PEARL = {
  magnetRadius: 125,
  collectRadius: 28,
  life: 14,
  tideCharge: 0.07,
  score: 10,
};

export const HARBOR = {
  repairCost: 30,
  rerollCost: 15,
};
