// Progress that survives between runs: best score, banked salvage, owned and equipped anchors.
// It lives in localStorage; when storage is blocked the game simply remembers for this page view.

import { ANCHOR_TYPES, anchorType } from './anchor-types.js';

const KEY = 'deadweight-progress';
const OLD_BEST_KEY = 'deadweight-best-score';

const DEFAULTS = {
  best: 0,
  salvage: 0,
  unlocked: ['ship'],
  selected: 'ship',
  runs: 0,
  wins: 0,
  bosses: 0,
};

/** Salvage a finished run is worth: score, a bounty per boss, and a bonus for winning. */
export function salvageFor(stats, won) {
  return Math.floor(stats.score / 150) + 120 * stats.bosses + (won ? 150 : 0);
}

export class Progress {
  constructor() {
    this.data = { ...DEFAULTS, unlocked: [...DEFAULTS.unlocked] };
    this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') Object.assign(this.data, saved);
      else this.data.best = Number(localStorage.getItem(OLD_BEST_KEY)) || 0;
    } catch {
      // Blocked or corrupt storage: keep the defaults.
    }
    if (!this.data.unlocked.includes('ship')) this.data.unlocked.push('ship');
    if (!this.data.unlocked.includes(this.data.selected)) this.data.selected = 'ship';
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Private browsing: progress lasts for this page view only.
    }
  }

  get best() { return this.data.best; }
  get salvage() { return this.data.salvage; }
  get selected() { return this.data.selected; }

  isUnlocked(id) {
    return this.data.unlocked.includes(id);
  }

  /** Spend salvage on an anchor. Returns '' on success, otherwise why not. */
  buy(id) {
    const type = anchorType(id);
    if (this.isUnlocked(id)) return 'owned';
    if (this.data.salvage < type.cost) return 'poor';
    this.data.salvage -= type.cost;
    this.data.unlocked.push(id);
    this.data.selected = id;
    this.save();
    return '';
  }

  equip(id) {
    if (!this.isUnlocked(id)) return false;
    this.data.selected = id;
    this.save();
    return true;
  }

  /** Returns true when `score` beats the best so far. */
  recordBest(score) {
    if (score <= this.data.best) return false;
    this.data.best = Math.round(score);
    this.save();
    return true;
  }

  /** Bank a finished run. */
  recordRun(stats, won) {
    const earned = salvageFor(stats, won);
    this.data.salvage += earned;
    this.data.runs += 1;
    this.data.wins += won ? 1 : 0;
    this.data.bosses += stats.bosses;
    this.save();
    return earned;
  }

  /** How many of the four anchors are owned. */
  get owned() {
    return this.data.unlocked.filter((id) => ANCHOR_TYPES.some((type) => type.id === id)).length;
  }
}
