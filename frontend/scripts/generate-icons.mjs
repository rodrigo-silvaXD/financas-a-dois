/**
 * Gera ícones PWA placeholders (192 e 512) sem dependências externas.
 * PNG bruto: fundo brand + monograma "$" branco centralizado.
 * Substituir por artes finais depois.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// #4C5FA8 => 76,95,168
const BRAND = [0x4c, 0x5f, 0xa8];
const WHITE = [0xfd, 0xfd, 0xfd];

function makePng(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      // fundo brand
      raw[px]     = BRAND[0];
      raw[px + 1] = BRAND[1];
      raw[px + 2] = BRAND[2];
      raw[px + 3] = 255;

      // "moeda" branca central (círculo)
      const cx = size / 2, cy = size / 2, r = size * 0.32;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < r * r) {
        raw[px]     = WHITE[0];
        raw[px + 1] = WHITE[1];
        raw[px + 2] = WHITE[2];
      }
      // barra vertical do "$"
      const barW = size * 0.05;
      if (Math.abs(dx) < barW / 2 && Math.abs(dy) < r * 0.9) {
        raw[px]     = BRAND[0];
        raw[px + 1] = BRAND[1];
        raw[px + 2] = BRAND[2];
      }
      // barras horizontais do "$"
      const armLen = size * 0.13;
      const armH = size * 0.045;
      if (Math.abs(dx) < armLen && Math.abs(dy - r * 0.35) < armH / 2) {
        raw[px] = BRAND[0]; raw[px+1] = BRAND[1]; raw[px+2] = BRAND[2];
      }
      if (Math.abs(dx) < armLen && Math.abs(dy + r * 0.35) < armH / 2) {
        raw[px] = BRAND[0]; raw[px+1] = BRAND[1]; raw[px+2] = BRAND[2];
      }
    }
  }

  // chunks PNG
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const idatData = deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcInput = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    // CRC32
    let c = 0xffffffff;
    for (const b of crcInput) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const png = makePng(size);
  writeFileSync(join(outDir, `icon-${size}.png`), png);
  const hash = createHash("sha1").update(png).digest("hex").slice(0, 8);
  console.log(`icon-${size}.png  ${png.length} bytes  sha1=${hash}`);
}
