// Run: node create-icons.js
// Generates minimal PNG icons for the extension
// These are 1-pixel placeholder PNGs — replace with real branding icons later

const fs = require('fs');
const path = require('path');

// Minimal valid PNG generator (solid color square)
function createPNG(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xffffffff;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let k = n;
      for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
      table[n] = k;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — raw image data (dark background with lighter center)
  const rawRows = [];
  for (let y = 0; y < size; y++) {
    rawRows.push(0); // filter byte: None
    for (let x = 0; x < size; x++) {
      // Simple shield-like gradient
      const cx = size / 2, cy = size / 2;
      const dx = (x - cx) / cx, dy = (y - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.6 && dy > -0.7) {
        // Inner shield area — white
        rawRows.push(255, 255, 255);
      } else if (dist < 0.75 && dy > -0.8) {
        // Shield border — light gray
        rawRows.push(200, 200, 200);
      } else {
        // Background — dark
        rawRows.push(17, 17, 17);
      }
    }
  }

  // Compress with zlib (use deflate)
  const zlib = require('zlib');
  const rawBuf = Buffer.from(rawRows);
  const compressed = zlib.deflateSync(rawBuf);

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
});

console.log('Done! Icons generated in icons/ directory.');
