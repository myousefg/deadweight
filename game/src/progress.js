// Progress that survives between runs: best scores, banked salvage, owned and equipped anchors,
// workshop talents, medals and a little career history. It lives in localStorage; when storage is
// blocked the game simply remembers for this page view.

import { ANCHOR_TYPES, anchorType } from './anchor-types.js';
import { TALENTS, talentById, maxLevel } from './talents.js';

const KEY = 'deadweight-progress';
const OLD_BEST_KEY = 'deadweight-best-score';

const defaults = () => ({
  best: 0,
  bestDive: 0,
  salvage: 0,
  unlocked: ['ship'],
  selected: 'ship',
  runs: 0,
  wins: 0,
  bosses: 0,
  kills: 0,
  talents: {},
  medals: {},
  bossKills: {},
  contracts: 0,
});

/** Salvage a finished run is worth: score, a bounty per boss, a bonus for winning, and contracts. */
export function salvageFor(stats, won, bountyLevel = 0) {
  const base = Math.floor(stats.score / 150) + 120 * stats.bosses + (won ? 150 : 0) + (stats.contractSalvage || 0);
  return Math.round(base * (1 + 0.15 * bountyLevel));
}

export class Progress {
  constructor() {
    this.data = defaults();
    /** A volatile progress never touches storage (used to stage screenshots). */
    this.volatile = false;
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
    for (const field of ['talents', 'medals', 'bossKills']) {
      if (!this.data[field] || typeof this.data[field] !== 'object') this.data[field] = {};
    }
  }

  save() {
    if (this.volatile) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Private browsing: progress lasts for this page view only.
    }
  }

  /** Replace everything with `data` for this page view only (never written to storage). */
  stage(data = {}) {
    this.volatile = true;
    this.data = { ...defaults(), ...data };
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

  /* ---------------------------------------------------------------- talents */

  talentLevel(id) {
    return this.data.talents[id] || 0;
  }

  /** The salvage the next level of a talent costs, or 0 when it is fully learned. */
  talentCost(id) {
    const talent = talentById(id);
    const level = this.talentLevel(id);
    return level >= maxLevel(talent) ? 0 : talent.costs[level];
  }

  /** Buy the next level of a talent. Returns '' on success, otherwise 'maxed' or 'poor'. */
  buyTalent(id) {
    const cost = this.talentCost(id);
    if (cost === 0) return 'maxed';
    if (this.data.salvage < cost) return 'poor';
    this.data.salvage -= cost;
    this.data.talents[id] = this.talentLevel(id) + 1;
    this.save();
    return '';
  }

  get talentTotal() {
    return TALENTS.reduce((sum, talent) => sum + this.talentLevel(talent.id), 0);
  }

  /* ----------------------------------------------------------------- medals */

  hasMedal(id) {
    return !!this.data.medals[id];
  }

  grantMedal(id) {
    if (this.data.medals[id]) return;
    this.data.medals[id] = this.data.runs || 1;
    this.save();
  }

  get medalCount() {
    return Object.keys(this.data.medals).length;
  }

  bossesDown(id) {
    return this.data.bossKills[id] || 0;
  }

  /* ----------------------------------------------------------------- scores */

  /** Returns true when `score` beats the best so far. */
  recordBest(score, endless = false, wave = 0) {
    if (endless) {
      if (wave > this.data.bestDive) {
        this.data.bestDive = wave;
        this.save();
        return true;
      }
      return false;
    }
    if (score <= this.data.best) return false;
    this.data.best = Math.round(score);
    this.save();
    return true;
  }

  /** Bank a finished run. */
  recordRun(stats, won) {
    const earned = salvageFor(stats, won, this.talentLevel('bounty'));
    this.data.salvage += earned;
    this.data.runs += 1;
    this.data.wins += won ? 1 : 0;
    this.data.bosses += stats.bosses;
    this.data.kills += stats.kills;
    this.data.contracts += stats.contracts || 0;
    for (const id of stats.bossIds || []) this.data.bossKills[id] = (this.data.bossKills[id] || 0) + 1;
    this.save();
    return earned;
  }

  /** How many of the four anchors are owned. */
  get owned() {
    return this.data.unlocked.filter((id) => ANCHOR_TYPES.some((type) => type.id === id)).length;
  }
}
