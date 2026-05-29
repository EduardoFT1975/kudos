/**
 * KUDOS QR Generator - PROMPT 5/6.
 *
 * Generador de QR Code zero-deps en TypeScript puro.
 * Basado en QR Code Model 2, version dinamica 1-10, ECC nivel L.
 * Suficiente para URLs cortas (kudos.world/c/wd-Q10285 = ~30 chars).
 *
 * Salida: matriz boolean[][] (modules) que el componente React renderiza como
 * SVG con celdas negras/blancas. CERO bytes de red. CERO servicios externos.
 *
 * Implementacion basada en QR Code Generator de Project Nayuki (MIT) reducido.
 */

// ---------- Tipos publicos ----------

export interface QRCodeMatrix {
  size: number;             // ancho/alto en modulos
  modules: boolean[][];     // true = negro, false = blanco
  version: number;
}


// ---------- Implementacion ----------

const MODE_BYTE = 0x4;
const ECC_L_CW: Record<number, number[]> = {
  1:  [19],
  2:  [34],
  3:  [55],
  4:  [80],
  5:  [108],
  6:  [136],
  7:  [156],
  8:  [194],
  9:  [232],
  10: [274],
};
const ALIGNMENT_PAT_POS: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};


export function encodeQR(text: string, minVersion = 1, maxVersion = 10): QRCodeMatrix {
  const bytes = new TextEncoder().encode(text);
  const seg = makeByteSegment(bytes);

  // Buscar version minima que aguante segmento + overhead
  let version = minVersion;
  while (version <= maxVersion) {
    const dataCapacityBits = ECC_L_CW[version][0] * 8;
    const usedBits = 4 + lengthBits(version) + seg.bits.length;
    if (usedBits <= dataCapacityBits) break;
    version++;
  }
  if (version > maxVersion) {
    // Fallback: encode pero truncado (no deberia pasar con URL kudos.world/c/ID)
    version = maxVersion;
  }

  const size = 17 + version * 4;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  drawFunctionPatterns(modules, reserved, version, size);

  // Construir bitstream
  const dataCapacityBytes = ECC_L_CW[version][0];
  const dataBits: number[] = [];
  appendBits(dataBits, MODE_BYTE, 4);
  appendBits(dataBits, bytes.length, lengthBits(version));
  for (const bit of seg.bits) dataBits.push(bit);

  // Padding
  while (dataBits.length < dataCapacityBytes * 8 && dataBits.length % 8 !== 0) {
    dataBits.push(0);
  }
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (dataBits.length < dataCapacityBytes * 8) {
    appendBits(dataBits, padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Bits -> bytes
  const dataBytes = new Uint8Array(dataCapacityBytes);
  for (let i = 0; i < dataBytes.length; i++) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | (dataBits[i * 8 + b] || 0);
    dataBytes[i] = v;
  }

  // ECC Reed-Solomon
  const ecc = reedSolomon(dataBytes, totalCodewords(version) - dataCapacityBytes);
  const allBytes = new Uint8Array(dataBytes.length + ecc.length);
  allBytes.set(dataBytes, 0);
  allBytes.set(ecc, dataBytes.length);

  // Convertir a bits y dibujar
  const allBits: number[] = [];
  for (let i = 0; i < allBytes.length; i++) {
    for (let b = 7; b >= 0; b--) allBits.push((allBytes[i] >> b) & 1);
  }
  drawCodewords(modules, reserved, allBits, size);

  // Elegir mejor mask (probamos 0..7, picking lowest penalty)
  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(modules, reserved, m, size);
    drawFormatBits(modules, m, size);
    const p = penalty(modules, size);
    if (p < bestPenalty) { bestPenalty = p; bestMask = m; }
    applyMask(modules, reserved, m, size);  // revertir
  }
  applyMask(modules, reserved, bestMask, size);
  drawFormatBits(modules, bestMask, size);

  return { size, modules, version };
}


// ---------- Helpers ----------

function makeByteSegment(bytes: Uint8Array): { bits: number[] } {
  const bits: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    for (let b = 7; b >= 0; b--) bits.push((bytes[i] >> b) & 1);
  }
  return { bits };
}

function lengthBits(version: number): number {
  return version < 10 ? 8 : 16;
}

function appendBits(arr: number[], val: number, n: number) {
  for (let i = n - 1; i >= 0; i--) arr.push((val >> i) & 1);
}

function totalCodewords(version: number): number {
  // tabla aproximada (suficiente para ECC L versiones 1-10)
  const M = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
  return M[version];
}


// ----- Function patterns (finders, separators, alignment, timing) -----

function drawFunctionPatterns(modules: boolean[][], reserved: boolean[][], version: number, size: number) {
  // 3 finder corners
  drawFinder(modules, reserved, 0, 0, size);
  drawFinder(modules, reserved, size - 7, 0, size);
  drawFinder(modules, reserved, 0, size - 7, size);

  // separators
  for (let i = 0; i < 8; i++) {
    if (i < size && 7 < size) reserved[i][7] = true;
    if (7 < size && i < size) reserved[7][i] = true;
    if (size - 8 + i >= 0 && size - 8 + i < size) reserved[size - 8 + i][7] = true;
    if (7 < size) reserved[7][size - 8 + i] = true;
    if (i < 8) reserved[size - 8][i] = true;
    if (i < 8) reserved[i][size - 8] = true;
  }

  // timing
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) { modules[6][i] = (i % 2 === 0); reserved[6][i] = true; }
    if (!reserved[i][6]) { modules[i][6] = (i % 2 === 0); reserved[i][6] = true; }
  }

  // alignment patterns
  const positions = ALIGNMENT_PAT_POS[version] || [];
  for (let r = 0; r < positions.length; r++) {
    for (let c = 0; c < positions.length; c++) {
      const ar = positions[r], ac = positions[c];
      // skip overlap con finders
      if ((ar < 8 && ac < 8) || (ar < 8 && ac > size - 9) || (ar > size - 9 && ac < 8)) continue;
      drawAlignment(modules, reserved, ar, ac);
    }
  }

  // dark module
  if (size > 8) { modules[size - 8][8] = true; reserved[size - 8][8] = true; }

  // format info area reservada (la rellenamos despues con drawFormatBits)
  for (let i = 0; i < 9; i++) reserved[8][i] = reserved[i][8] = true;
  for (let i = 0; i < 8; i++) reserved[8][size - 1 - i] = reserved[size - 1 - i][8] = true;
}


function drawFinder(modules: boolean[][], reserved: boolean[][], row: number, col: number, size: number) {
  for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
    const rr = row + r, cc = col + c;
    if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
    const isDark =
      (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
      (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
      (r >= 2 && r <= 4 && c >= 2 && c <= 4);
    modules[rr][cc] = isDark;
    reserved[rr][cc] = true;
  }
}


function drawAlignment(modules: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
    const isDark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
    modules[row + r][col + c] = isDark;
    reserved[row + r][col + c] = true;
  }
}


// ----- Codewords zigzag -----

function drawCodewords(modules: boolean[][], reserved: boolean[][], bits: number[], size: number) {
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;  // skip timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!reserved[y][x] && i < bits.length) {
          modules[y][x] = bits[i] === 1;
          i++;
        }
      }
    }
  }
}


// ----- Mask -----

function applyMask(modules: boolean[][], reserved: boolean[][], mask: number, size: number) {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (reserved[y][x]) continue;
    let invert = false;
    switch (mask) {
      case 0: invert = (x + y) % 2 === 0; break;
      case 1: invert = y % 2 === 0; break;
      case 2: invert = x % 3 === 0; break;
      case 3: invert = (x + y) % 3 === 0; break;
      case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
      case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
      case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
    }
    if (invert) modules[y][x] = !modules[y][x];
  }
}


function penalty(modules: boolean[][], size: number): number {
  let p = 0;
  // row + column runs of 5+
  for (let y = 0; y < size; y++) {
    let run = 1;
    for (let x = 1; x < size; x++) {
      if (modules[y][x] === modules[y][x - 1]) {
        run++; if (run === 5) p += 3; else if (run > 5) p++;
      } else run = 1;
    }
  }
  for (let x = 0; x < size; x++) {
    let run = 1;
    for (let y = 1; y < size; y++) {
      if (modules[y][x] === modules[y - 1][x]) {
        run++; if (run === 5) p += 3; else if (run > 5) p++;
      } else run = 1;
    }
  }
  // dark module ratio
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) dark++;
  const ratio = dark / (size * size);
  p += Math.floor(Math.abs(ratio - 0.5) * 20) * 10;
  return p;
}


// ----- Format info -----

function drawFormatBits(modules: boolean[][], mask: number, size: number) {
  // ECC L = 01, mask = 3 bits
  const data = (0b01 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >> 9) * 0b10100110111);
  }
  const bits = ((data << 10) | rem) ^ 0b101010000010010;

  for (let i = 0; i <= 5; i++) modules[8][i] = ((bits >> i) & 1) === 1;
  modules[8][7] = ((bits >> 6) & 1) === 1;
  modules[8][8] = ((bits >> 7) & 1) === 1;
  modules[7][8] = ((bits >> 8) & 1) === 1;
  for (let i = 9; i < 15; i++) modules[14 - i][8] = ((bits >> i) & 1) === 1;
  for (let i = 0; i < 8; i++) modules[size - 1 - i][8] = ((bits >> i) & 1) === 1;
  for (let i = 8; i < 15; i++) modules[8][size - 15 + i] = ((bits >> i) & 1) === 1;
}


// ----- Reed-Solomon ECC -----

function reedSolomon(data: Uint8Array, eccLen: number): Uint8Array {
  const generator = rsGenerator(eccLen);
  const result = new Uint8Array(eccLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    for (let j = 0; j < eccLen - 1; j++) result[j] = result[j + 1] ^ gfMul(generator[j], factor);
    result[eccLen - 1] = gfMul(generator[eccLen - 1], factor);
  }
  return result;
}

function rsGenerator(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}

function gfMul(a: number, b: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >> 7) * 0x11D);
    z ^= ((b >> i) & 1) * a;
  }
  return z & 0xFF;
}
