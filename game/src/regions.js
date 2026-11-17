// The voyage: three regions of three waves each. A region sets the look of the sea, its hazard,
// and the boss waiting on its third wave. Wave numbers run 1 to 9 across the whole voyage.

export const WAVES_PER_REGION = 3;

export const REGIONS = [
  null,
  {
    id: 'shallows',
    name: 'Sunlit Shallows',
    boss: 'colossus',
    bossName: 'Hermit Colossus',
    hazard: 'No hazards',
    blurb: 'Warm, clear water to learn the swing. A giant hermit crab guards the way out.',
  },
  {
    id: 'kelp',
    name: 'Kelp Maze',
    boss: 'eel',
    bossName: 'Storm Eel Queen',
    hazard: 'Kelp slows boats and fish',
    blurb: 'Thick kelp tangles the channels. Something long and electric hunts in the fronds.',
  },
  {
    id: 'abyss',
    name: 'The Abyss',
    boss: 'kraken',
    bossName: 'The Kraken',
    hazard: 'Whirlpools drag you in',
    blurb: 'Black water, glowing things and hungry whirlpools. The Kraken waits below.',
  },
];

/** Which region (1 to 3) a wave number belongs to. */
export const regionIndexOf = (wave) => Math.max(1, Math.ceil(Math.max(1, wave) / WAVES_PER_REGION));
export const regionOf = (wave) => REGIONS[regionIndexOf(wave)];
/** True for the first wave of a region, where the sea chart is shown. */
export const isRegionStart = (wave) => (wave - 1) % WAVES_PER_REGION === 0;
/** True for the last wave of a region, where its boss appears. */
export const isBossWave = (wave) => wave % WAVES_PER_REGION === 0;
