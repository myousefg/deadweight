// Deadweight's program (Node 22, standard library only). The game itself is the static files in
// game/; this program only hands it in: it copies game/ and screenshots/ to the output folder and
// writes dossier.json, the summary the judge reads, with make.fun's vendored library.
//
// Run it outside the grader like this (MAKEFUN_OUTPUT_DIR stands in for /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the bounty's scorer passes to buildDossier. Only text_max_bytes changes the dossier's
// bytes; the rest make this program fail exactly where the scorer would refuse the entry.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Copy one folder of the repository into the output folder, when the repository has it. */
function copyFolder(name: string): void {
  const from = join(repoRoot, name);
  if (existsSync(from)) cpSync(from, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyFolder('game');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyFolder('screenshots');

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));
console.log(`Deadweight handed in to ${outputDir}`);
