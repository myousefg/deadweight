// The wave table: twelve waves in four regions, two ordinary waves and then that region's boss. The
// Deep Dive reuses the same table lap after lap with a bigger budget. This file is pure data and
// numbers; sim/director.js turns a wave into a schedule of spawns.

export const FINAL_WAVE = 12;
/** Tuning for how a wave budget becomes spawns. */
export const WAVE_RULES = {
  /** Most creatures alive at once; spawns wait while the sea is this full. */
  aliveCap: 22,
  /** How many more creatures a stormy sea brings. */
  stormBudget: 1.3,
  /** Extra budget per lap of the Deep Dive. */
  lapBudget: 0.32,
  /** How likely each kind is to be picked when a wave budget is spent. */
  weights: { jelly: 5, piranha: 2.2, urchin: 2, puffer: 2, shark: 1.2, manta: 1.7, angler: 1.2 },
};

const ALL = ['jelly', 'piranha', 'urchin', 'puffer', 'shark', 'manta', 'angler'];

export const WAVES = [
  null,
  { name: 'Calm Shallows', budget: 7, types: ['jelly'], span: 20, hint: 'Swing the anchor through them. Speed is damage.' },
  { name: 'Snapping Waters', budget: 11, types: ['jelly', 'piranha'], span: 24, hint: 'Snappers flash before they dart. Sidestep, then swat.' },
  { name: 'Crab Rock', boss: 'colossus', hint: 'Its armour turns blows aside. Dash through the shockwave; hit it when dazed.' },
  { name: 'Tangled Fronds', budget: 16, types: ['jelly', 'piranha', 'urchin'], span: 26, hint: 'Kelp slows boats and fish. Urchins burst into spines.' },
  { name: 'Puffer Cove', budget: 22, types: ['jelly', 'piranha', 'urchin', 'puffer'], span: 28, hint: 'Bat a puffer’s spines back with a fast swing.' },
  { name: 'The Queen’s Channel', boss: 'eel', hint: 'Hit any part of her body. Dodge the blue circles and the red sweeps.' },
  { name: 'Wreck Row', budget: 26, types: ['jelly', 'piranha', 'urchin', 'manta'], span: 28, hint: 'Mines blow up on touch. Swat one from afar to catch the fish around it.' },
  { name: 'Ghost Lanes', budget: 33, types: ['jelly', 'piranha', 'puffer', 'shark', 'manta'], span: 32, hint: 'Mantas call lightning on where you stand. Keep moving.' },
  { name: 'The Admiral’s Fleet', boss: 'admiral', hint: 'Slip between its cannon lanes. Lure it into mines and ram-bait it into a wall.' },
  { name: 'Sunless Trench', budget: 40, types: ['jelly', 'piranha', 'urchin', 'puffer', 'shark', 'angler'], span: 34, hint: 'Whirlpools drag you in. Anglers call jellies: sink them first.' },
  { name: 'Black Currents', budget: 48, types: ALL, span: 36, hint: 'Keep your combo alive: chains multiply the score.' },
  { name: 'Heart of the Abyss', boss: 'kraken', hint: 'Dodge the red circles. Hit the body.' },
];

/** The definition of any wave number, including the Deep Dive laps past the twelfth. */
export function waveDef(wave) {
  if (wave <= FINAL_WAVE) return WAVES[wave];
  const base = WAVES[((wave - 1) % FINAL_WAVE) + 1];
  const lap = Math.floor((wave - 1) / FINAL_WAVE);
  if (base.boss) return base;
  return { ...base, budget: Math.round(base.budget * (1 + WAVE_RULES.lapBudget * lap)), span: base.span + lap * 2 };
}

