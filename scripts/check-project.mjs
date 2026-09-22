import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtimeFiles = ['index.html','css/styles.css','js/app.js','js/core/data.js','js/core/storage.js','js/core/audio.js','js/core/achievements.js','js/core/game-host.js','js/core/bubble-rules.js','js/games/bubble-blast-duo.js','manifest.webmanifest','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-512.png'];
const deliverables = ['service-worker.js','.nojekyll','README.md','DEPLOYMENT.md','ARCHITECTURE.md','RELEASE-NOTES.md','TEST-REPORT.md','TEST-CHECKLIST.md','package.json','test/data.test.js','test/bubble-rules.test.js'];
const required = [...runtimeFiles, ...deliverables];
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || !manifest.start_url || manifest.icons.length < 3) throw new Error('Manifest is incomplete.');
for (const file of required) await access(resolve(root, file));
const html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const label of ['Bubble Blast Duo','Cosmic Co-Pilots','Brain Battle','Treasure Temple','Coming soon','60s Classic','3-Round Cup','Solo','Team up','Versus']) if (!html.includes(label)) throw new Error(`Missing required content: ${label}`);
const worker = await readFile(resolve(root, 'service-worker.js'), 'utf8');
for (const file of runtimeFiles) {
  const cachePath = `./${file}`; if (!worker.includes(cachePath) && !['index.html'].includes(file)) throw new Error(`Service worker does not cache ${file}`);
}
if (!worker.includes("pixel-arcade-v1.1.0")) throw new Error('Service worker cache version was not updated.');
console.log(`Project check passed: ${required.length} required files, valid manifest, complete Bubble Blast modes, and offline shell.`);
