import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const file = resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
    if (!file.startsWith(root)) { response.writeHead(403).end('Forbidden'); return; }
    const body = await readFile(file); response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); response.end(body);
  } catch (_) { response.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Pixel Arcade is running at http://127.0.0.1:${port}/`));
