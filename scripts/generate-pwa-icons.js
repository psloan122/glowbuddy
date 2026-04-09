// Generates solid-color placeholder PNG icons for PWA manifest.
// Uses only Node built-ins (zlib + Buffer) — no extra deps.
// Color: Know Before You Glow hot-pink #E8347A.
//
// Run with: node scripts/generate-pwa-icons.js

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

const HOT_PINK = { r: 0xE8, g: 0x34, b: 0x7A };

function buildChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function buildSolidPNG(width, height, color) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — raw scanlines: filter byte (0) + RGB pixels
  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const off = y * rowBytes;
    raw[off] = 0; // filter type none
    for (let x = 0; x < width; x++) {
      const px = off + 1 + x * 3;
      raw[px] = color.r;
      raw[px + 1] = color.g;
      raw[px + 2] = color.b;
    }
  }
  const compressed = deflateSync(raw);

  return Buffer.concat([
    signature,
    buildChunk('IHDR', ihdr),
    buildChunk('IDAT', compressed),
    buildChunk('IEND', Buffer.alloc(0)),
  ]);
}

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of targets) {
  const png = buildSolidPNG(size, size, HOT_PINK);
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`wrote ${name} (${size}x${size}, ${png.length} bytes)`);
}
