// The Gilded Vault — entrypoint. Copies game/ and screenshots/ from this
// repository into the output directory and writes the dossier with
// make.fun's vendored library, using the scorer's caps. Run under Node 22:
//   node main.ts            (writes /output, or $MAKEFUN_OUTPUT_DIR)
// The grader runs this same file and compares its dossier byte for byte.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function listFiles(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else out.push(p.slice(base.length + 1));
  }
  return out.sort();
}

const gameDir = join(HERE, 'game');
const shotsDir = join(HERE, 'screenshots');
if (!existsSync(gameDir)) throw new Error('game/ is missing');
if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');

const shots = listFiles(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
// Refuse an over-size screenshot before anything is handed in: the
// scorer caps each at 262144 bytes, and a dossier built on a bad image
// would be refused at the gate anyway.
for (const s of shots) {
  const size = statSync(join(shotsDir, s)).size;
  if (size > CAPS.screenshots.max_bytes) {
    throw new Error(`screenshot ${s} is ${size} bytes, over the ${CAPS.screenshots.max_bytes} byte cap`);
  }
}

mkdirSync(OUT, { recursive: true });
cpSync(gameDir, join(OUT, 'game'), { recursive: true });
cpSync(shotsDir, join(OUT, 'screenshots'), { recursive: true });

const dossier = buildDossier(OUT, CAPS);
writeFileSync(join(OUT, 'dossier.json'), dossier);

const gameFiles = listFiles(join(OUT, 'game'));
console.log(`handed in ${gameFiles.length} game files, ${shots.length} screenshots, dossier ${dossier.length} bytes`);
for (const s of shots) {
  console.log(`screenshot ${s}: ${statSync(join(OUT, 'screenshots', s)).size} bytes`);
}
