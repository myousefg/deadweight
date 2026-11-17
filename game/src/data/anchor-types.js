// The four anchors you can own. Each one rewrites a few numbers of the run's build before the
// first wave, so they genuinely play differently: reach, weight, speed and a starting perk.

import { ANCHOR } from '../core/config.js';
import { createBuild } from './upgrades.js';

export const ANCHOR_TYPES = [
  {
    id: 'ship',
    name: 'Ship’s Anchor',
    cost: 0,
    blurb: 'Balanced and honest. A heavy iron anchor that does what anchors do.',
    apply() {},
  },
  {
    id: 'grapnel',
    name: 'Grapnel',
    cost: 300,
    blurb: 'Light and quick with a long chain, but it hits softer.',
    apply(build) {
      build.rope += 70;
      build.spring *= 1.25;
      build.damage *= 0.85;
      build.anchorSize *= 0.9;
    },
  },
  {
    id: 'mace',
    name: 'Iron Mace',
    cost: 800,
    blurb: 'A spiked wrecking ball: huge damage and a wide hit, but a short, slow chain.',
    apply(build) {
      build.damage *= 1.4;
      build.rope -= 55;
      build.spring *= 0.8;
      build.anchorSize *= 1.25;
    },
  },
  {
    id: 'lantern',
    name: 'Storm Lantern',
    cost: 1500,
    blurb: 'Crackles with lightning on every kill and charges the Tide Surge faster.',
    apply(build) {
      build.lightning += 1;
      build.surgeRate *= 1.3;
      build.damage *= 0.9;
    },
  },
];

export function anchorType(id) {
  return ANCHOR_TYPES.find((type) => type.id === id) || ANCHOR_TYPES[0];
}

export function applyAnchorType(build, id) {
  anchorType(id).apply(build);
}

/** Headline numbers for the dock's stat bars, read off a fresh build with this anchor applied. */
export function anchorStats(id) {
  const build = createBuild();
  applyAnchorType(build, id);
  return {
    damage: build.damage * build.anchorSize,
    reach: ANCHOR.rope + build.rope,
    speed: build.spring,
    perk: build.lightning > 0,
  };
}
