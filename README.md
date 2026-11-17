# deadweight

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/myousefg/deadweight/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/myousefg/deadweight/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Deadweight** is a top-down arcade game about a tiny rowboat and a very heavy anchor. Row with the
keyboard, swing the anchor with the mouse, and let momentum do the work: the faster the anchor
moves, the harder it hits. Sail a three-region voyage, beat a boss in each, spend your pearls at the
harbor and your salvage at the dock.

It is plain HTML5 canvas and ES modules, with no library, no build step, no image files and no
network request. Every sprite is drawn in code and every sound is synthesised with Web Audio.

![Deadweight: the Storm Eel Queen](screenshots/1-play.jpg)

## The voyage

Nine waves in three regions. Each region has its own look, hazard, creatures and boss.

| Region | Hazard | Boss |
| --- | --- | --- |
| Sunlit Shallows | none | **Hermit Colossus**: armoured, so dash through its shockwaves and hit it when it is dazed |
| Kelp Maze | kelp slows boats and fish | **Storm Eel Queen**: a long serpent that calls lightning and sweeps the whole sea |
| The Abyss | whirlpools drag you in | **The Kraken**: tentacle slams, ink fans and summoned jellies |

Before each region the **sea chart** shows the voyage and offers a bet: *calm seas*, or *stormy seas*
for 30% more creatures, a tougher boss and half again as much score.

## How to play

| Control | Action |
| --- | --- |
| `W` `A` `S` `D` or arrows | Row the boat |
| Mouse | Drag the anchor; it follows the cursor on a springy chain, so swing speed is blow strength |
| Click | Slam the anchor down for a crushing area blow |
| `Shift` | Dash (a moment of invulnerability) |
| `Space` or right click | Tide Surge, once the meter is full (pearls and kills charge it) |
| `P` / `Esc`, `M` | Pause, mute |

- **Tap, Wham, Crush:** the anchor's speed sets its damage tier, shown by its trail colour.
- **Snappers** flash before they dart, **urchins** burst into spines, **puffers** fire spines you can
  bat back, **sharks** charge in a line and are dazed after.
- After each wave you pick one of three upgrade cards at the harbor (13 upgrades, three rarities),
  and can spend pearls to reroll the cards or mend a life ring.
- Every finished run banks **salvage**. Spend it at **the dock** on four anchors that play
  differently: the balanced Ship's Anchor, the long and quick Grapnel, the heavy Iron Mace and the
  lightning-wreathed Storm Lantern. What you own and wear is saved in the browser.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome. (`game/` is plain static files, so any static
file server works too.)

To build the hand-in folder the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshot scenes are staged by the game itself: add `?shot=start`, `?shot=play`, `?shot=harbor`,
`?shot=end`, `?shot=chart` or `?shot=dock` to the address (see `shots.json` and
`game/src/shots.js`).

## How the code is laid out

Everything the game needs is in `game/`; each file has one job.

| Folder / file | Job |
| --- | --- |
| `src/main.js`, `game.js`, `input.js`, `audio.js` | Boot, fixed-step loop and scene switching, keyboard and mouse, synthesised sound |
| `src/world.js`, `combat.js`, `waves.js` | The simulation, contact rules and scoring, the wave table and spawn director |
| `src/regions.js`, `currents.js` | The three regions, and their kelp and whirlpool hazards |
| `src/boat.js`, `anchor.js`, `anchor-types.js` | The player: sailing and dashing, the spring-and-chain anchor, the four anchors |
| `src/progress.js` | Salvage, owned anchors and best score, saved between visits |
| `src/enemies/` | One file per creature (jelly, piranha, urchin, puffer, shark) and boss (colossus, eel, kraken): behaviour and art together |
| `src/upgrades.js`, `pickups.js`, `projectiles.js`, `hazards.js` | The build and cards, pearls and life rings, spines and ink, slams, bolts and shockwave rings |
| `src/scenes/` | Title, dock, sea chart, play, harbor, game over and victory |
| `src/render/` | Sea backgrounds, boat and anchor art, HUD, UI kit, icons, chart art, results panel |
| `src/autopilot.js`, `shots.js` | A computer pilot that powers the title demo, plays the game for testing and stages the screenshots |

`main.ts`, `serve.ts` and `vendor/makefun-game.ts` are the make.fun hand-in program, a static file
server for local play, and make.fun's own library (copied unchanged from the bounty kit).

## Built by an AI agent

This game was designed and written by an AI coding agent working with its human in a single
session, for make.fun's "Make the best game" bounty. The session transcripts are uploaded with the
entry.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
