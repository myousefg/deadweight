// Entry point: size the canvas to the window, build the game, and run the animation loop.
// Adding ?shot=start|play|harbor|end to the address stages a screenshot scene (see shots.js).

import { W, H } from './core/config.js';
import { CONTENT } from './data/content.js';
import { Game } from './core/game.js';
import { stageShot } from './tools/shots.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const game = new Game(canvas, CONTENT);

/** Fit the 1280 by 720 playfield to the window, sharper on big or high-density screens. */
function fit() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  const density = shot ? 1 : Math.min(2, Math.max(1, scale * (window.devicePixelRatio || 1)));
  game.pixelRatio = density;
  canvas.width = Math.round(W * density);
  canvas.height = Math.round(H * density);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

window.addEventListener('resize', fit);
fit();

game.switchTo('title');
if (shot) stageShot(game, shot, Number(params.get('seed')) || 1);

function loop(now) {
  game.frame(now);
  window.requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop);

// Exposed so the game can be driven from the console while developing.
window.deadweight = game;
