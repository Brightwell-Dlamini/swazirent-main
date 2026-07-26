/**
 * Generates minimal PNG PWA icons from a solid indigo square + simple house mark.
 * Run: node scripts/generate-pwa-icons.mjs
 * Requires no deps — pure PNG encoder for solid + rectangle shapes is heavy,
 * so we write tiny valid PNGs via a minimal approach using pure buffers.
 *
 * If this fails on your machine, open public/icons/icon.svg in a browser,
 * screenshot/export 192 and 512 PNGs, and drop them in public/icons/.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeB, data]));
  crcB.writeUInt32BE(crc);
  return Buffer.concat([len, typeB, data, crcB]);
}

/** Solid indigo PNG size×size */
function solidPng(size, rgba = [79, 70, 229, 255]) {
  const [r, g, b, a] = rgba;
  const row = Buffer.alloc(1 + size * 4);
  const raw = Buffer.alloc((1 + size * 4) * size);
  for (let y = 0; y < size; y++) {
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 4;
      row[i] = r;
      row[i + 1] = g;
      row[i + 2] = b;
      row[i + 3] = a;
    }
    row.copy(raw, y * row.length);
  }
  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync(join(outDir, 'icon-192.png'), solidPng(192));
writeFileSync(join(outDir, 'icon-512.png'), solidPng(512));
writeFileSync(join(outDir, 'icon-maskable-512.png'), solidPng(512));
console.log('Wrote icon-192.png, icon-512.png, icon-maskable-512.png to public/icons/');
console.log('Optional: replace with designed icons from icon.svg for a sharper home-screen look.');
