// The voyage: four regions of three waves each. A region sets the look of the sea, its hazard,
// and the boss waiting on its third wave. Wave numbers run 1 to 12 across the whole voyage; the
// endless Deep Dive keeps counting and cycles through the regions again, tougher each lap.

export const WAVES_PER_REGION = 3;
export const REGION_COUNT = 4;

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
    id: 'fleet',
    name: 'Sunken Fleet',
    boss: 'admiral',
    bossName: 'The Drowned Admiral',
    hazard: 'Drifting mines blow up on touch',
    blurb: 'A galleon graveyard. Mines drift between the wrecks, and a ghost ship keeps its guns loaded.',
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

/** Which region (1 to 4) a wave number belongs to; the Deep Dive wraps round again. */
export const regionIndexOf = (wave) => ((Math.ceil(Math.max(1, wave) / WAVES_PER_REGION) - 1) % REGION_COUNT) + 1;
export const regionOf = (wave) => REGIONS[regionIndexOf(wave)];
/** True for the first wave of a region, where the sea chart is shown. */
export const isRegionStart = (wave) => (wave - 1) % WAVES_PER_REGION === 0;
/** True for the last wave of a region, where its boss appears. */
export const isBossWave = (wave) => wave % WAVES_PER_REGION === 0;
/** How many full laps of the voyage came before this wave (always 0 outside the Deep Dive). */
export const lapOf = (wave) => Math.floor((Math.max(1, wave) - 1) / (WAVES_PER_REGION * REGION_COUNT));
