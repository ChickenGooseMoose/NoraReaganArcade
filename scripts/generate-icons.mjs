import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'assets', 'icons'); mkdirSync(out, { recursive: true });
const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
function crc32(buffer) { let c = 0xffffffff; for (const value of buffer) c = table[(c ^ value) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([length, name, data, crc]); }
function createIcon(size, maskable = false) {
  const pixels = Buffer.alloc((size * 4 + 1) * size); const center = size / 2; const safe = maskable ? .36 : .44;
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1); pixels[row] = 0;
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / size, dy = (y - center) / size, d = Math.sqrt(dx * dx + dy * dy);
      let r = Math.round(13 + 28 * (1 - y / size)), g = Math.round(7 + 11 * x / size), b = Math.round(39 + 37 * (1 - d));
      const bubble1 = Math.hypot(dx + .13, dy + .06); const bubble2 = Math.hypot(dx - .15, dy - .1);
      if (bubble1 < safe * .34) { const t = bubble1 / (safe * .34); r = Math.round(70 + 50 * t); g = Math.round(238 - 80 * t); b = Math.round(239 - 5 * t); }
      if (bubble2 < safe * .29) { const t = bubble2 / (safe * .29); r = Math.round(255 - 40 * t); g = Math.round(92 - 30 * t); b = Math.round(170 + 55 * t); }
      const diamond = Math.abs(dx) + Math.abs(dy); if (diamond < safe * .21 && !(bubble1 < safe * .34) && !(bubble2 < safe * .29)) { r = 245; g = 250; b = 255; }
      const sparkle = (Math.abs(dx + .27) < .012 && Math.abs(dy - .24) < .07) || (Math.abs(dy - .24) < .012 && Math.abs(dx + .27) < .07); if (sparkle) { r = 210; g = 255; b = 112; }
      const offset = row + 1 + x * 4; pixels[offset] = r; pixels[offset + 1] = g; pixels[offset + 2] = b; pixels[offset + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(pixels, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
for (const [name, size, maskable] of [['icon-192.png',192,false],['icon-512.png',512,false],['icon-maskable-512.png',512,true]]) writeFileSync(resolve(out, name), createIcon(size, maskable));
console.log('Generated Pixel Arcade PNG icons.');
