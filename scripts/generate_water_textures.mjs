import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Helper to compute CRC32 for PNG chunks
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    crc32.table = table;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makePng(width, height, rgbaBuffer) {
  // Scanlines with filter byte 0 (None)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let srcPos = 0;
  let dstPos = 0;
  for (let y = 0; y < height; y++) {
    rawData[dstPos++] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      rawData[dstPos++] = rgbaBuffer[srcPos++]; // R
      rawData[dstPos++] = rgbaBuffer[srcPos++]; // G
      rawData[dstPos++] = rgbaBuffer[srcPos++]; // B
      rawData[dstPos++] = rgbaBuffer[srcPos++]; // A
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = Buffer.alloc(4 + 4 + 13 + 4);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdrData.copy(ihdrChunk, 8);
  const ihdrCrc = crc32(ihdrChunk.subarray(4, 21));
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);

  // IDAT
  const idatChunk = Buffer.alloc(4 + 4 + compressed.length + 4);
  idatChunk.writeUInt32BE(compressed.length, 0);
  idatChunk.write('IDAT', 4);
  compressed.copy(idatChunk, 8);
  const idatCrcBuf = Buffer.concat([Buffer.from('IDAT'), compressed]);
  const idatCrc = crc32(idatCrcBuf);
  idatChunk.writeUInt32BE(idatCrc, 8 + compressed.length);

  // IEND
  const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Generate Normal Map 1 (Primary Swell & Medium Ripples)
function generateNormalMap1(size = 512) {
  const buf = Buffer.alloc(size * size * 4);
  const heightMap = new Float32Array(size * size);

  // Multi-harmonic sinusoids
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;

      let h = Math.sin(u * 4 + v * 2) * 0.45;
      h += Math.sin(u * 8 - v * 4) * 0.25;
      h += Math.cos(u * 14 + v * 10) * 0.15;
      h += Math.sin(-u * 22 + v * 18) * 0.08;
      h += Math.cos(u * 36 + v * 32) * 0.04;

      heightMap[y * size + x] = h;
    }
  }

  // Sobel Filter to Normal
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dx = (heightMap[y * size + xR] - heightMap[y * size + xL]) * 2.8;
      const dy = (heightMap[yD * size + x] - heightMap[yU * size + x]) * 2.8;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = (dx / len) * 0.5 + 0.5;
      const ny = (dy / len) * 0.5 + 0.5;
      const nz = (dz / len) * 0.5 + 0.5;

      const idx = (y * size + x) * 4;
      buf[idx] = Math.round(nx * 255);
      buf[idx + 1] = Math.round(ny * 255);
      buf[idx + 2] = Math.round(nz * 255);
      buf[idx + 3] = 255;
    }
  }

  return makePng(size, size, buf);
}

// 2. Generate Normal Map 2 (Fine Capillary Cross-Ripples)
function generateNormalMap2(size = 512) {
  const buf = Buffer.alloc(size * size * 4);
  const heightMap = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;

      let h = Math.sin(-u * 6 + v * 8) * 0.35;
      h += Math.cos(u * 16 + v * 12) * 0.25;
      h += Math.sin(u * 28 - v * 24) * 0.18;
      h += Math.cos(-u * 44 + v * 38) * 0.12;
      h += Math.sin(u * 64 + v * 58) * 0.06;

      heightMap[y * size + x] = h;
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dx = (heightMap[y * size + xR] - heightMap[y * size + xL]) * 3.4;
      const dy = (heightMap[yD * size + x] - heightMap[yU * size + x]) * 3.4;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = (dx / len) * 0.5 + 0.5;
      const ny = (dy / len) * 0.5 + 0.5;
      const nz = (dz / len) * 0.5 + 0.5;

      const idx = (y * size + x) * 4;
      buf[idx] = Math.round(nx * 255);
      buf[idx + 1] = Math.round(ny * 255);
      buf[idx + 2] = Math.round(nz * 255);
      buf[idx + 3] = 255;
    }
  }

  return makePng(size, size, buf);
}

// 3. Generate Foam Map (Cellular Bubble Foam Pattern)
function generateFoamMap(size = 512) {
  const buf = Buffer.alloc(size * size * 4);
  const numSeeds = 180;
  const seeds = [];
  for (let i = 0; i < numSeeds; i++) {
    seeds.push({
      x: Math.random() * size,
      y: Math.random() * size,
      radius: 8 + Math.random() * 24,
    });
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let minDist1 = 999999;
      let minDist2 = 999999;

      for (let i = 0; i < numSeeds; i++) {
        const s = seeds[i];
        let dx = Math.abs(x - s.x);
        let dy = Math.abs(y - s.y);
        if (dx > size * 0.5) dx = size - dx;
        if (dy > size * 0.5) dy = size - dy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist1) {
          minDist2 = minDist1;
          minDist1 = dist;
        } else if (dist < minDist2) {
          minDist2 = dist;
        }
      }

      // Voronoi cell boundary = bubble wall
      const cellEdge = Math.abs(minDist2 - minDist1);
      let foamVal = 0;
      if (cellEdge < 3.2) {
        foamVal = 1.0 - (cellEdge / 3.2);
      }
      // Inner bubble cluster
      if (minDist1 < 14) {
        foamVal = Math.max(foamVal, (1.0 - minDist1 / 14) * 0.65);
      }

      const byteVal = Math.round(Math.min(1.0, Math.max(0.0, foamVal)) * 255);
      const idx = (y * size + x) * 4;
      buf[idx] = byteVal;
      buf[idx + 1] = byteVal;
      buf[idx + 2] = byteVal;
      buf[idx + 3] = 255;
    }
  }

  return makePng(size, size, buf);
}

// 4. Generate Caustics Map (Interlocking luminous light cusps)
function generateCausticsMap(size = 512) {
  const buf = Buffer.alloc(size * size * 4);
  const numCusps = 140;
  const cusps = [];
  for (let i = 0; i < numCusps; i++) {
    cusps.push({
      x: Math.random() * size,
      y: Math.random() * size,
    });
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let d1 = 999999;
      let d2 = 999999;

      for (let i = 0; i < numCusps; i++) {
        const c = cusps[i];
        let dx = Math.abs(x - c.x);
        let dy = Math.abs(y - c.y);
        if (dx > size * 0.5) dx = size - dx;
        if (dy > size * 0.5) dy = size - dy;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d2 = d;
        }
      }

      // Caustic intensity peaks at cell ridge
      const ridge = d2 - d1;
      let caustic = 0;
      if (ridge < 12.0) {
        caustic = Math.pow(1.0 - (ridge / 12.0), 2.5) * 1.8;
      }

      const byteVal = Math.round(Math.min(1.0, Math.max(0.0, caustic)) * 255);
      const idx = (y * size + x) * 4;
      buf[idx] = byteVal;
      buf[idx + 1] = Math.round(byteVal * 0.95);
      buf[idx + 2] = Math.round(byteVal * 0.85); // Warm sun refracted caustic
      buf[idx + 3] = 255;
    }
  }

  return makePng(size, size, buf);
}

// Write to targets
const dirs = [
  'public/playcanvas_water',
  'playcanvas_water_package',
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

console.log('Generating normalMap1.png...');
const n1 = generateNormalMap1(512);
dirs.forEach(d => fs.writeFileSync(path.join(d, 'normalMap1.png'), n1));

console.log('Generating normalMap2.png...');
const n2 = generateNormalMap2(512);
dirs.forEach(d => fs.writeFileSync(path.join(d, 'normalMap2.png'), n2));

console.log('Generating foamMap.png...');
const foam = generateFoamMap(512);
dirs.forEach(d => fs.writeFileSync(path.join(d, 'foamMap.png'), foam));

console.log('Generating causticsMap.png...');
const caustics = generateCausticsMap(512);
dirs.forEach(d => fs.writeFileSync(path.join(d, 'causticsMap.png'), caustics));

console.log('All 4 textures generated successfully!');
