// Perceptual hash computation — ported from hatchmark-frontend/lib/phash.ts

const PHASH_DCT_SIZE = 32;
const PHASH_HASH_SIZE = 8;

let _dctMatrix = null;

function getDCTMatrix() {
  if (_dctMatrix) return _dctMatrix;
  _dctMatrix = [];
  for (let k = 0; k < PHASH_DCT_SIZE; k++) {
    const row = [];
    for (let n = 0; n < PHASH_DCT_SIZE; n++) {
      row.push(Math.cos((Math.PI / PHASH_DCT_SIZE) * (n + 0.5) * k));
    }
    _dctMatrix.push(row);
  }
  return _dctMatrix;
}

function applyDCT2D(matrix) {
  const dct = getDCTMatrix();
  const size = matrix.length;

  const temp = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let k = 0; k < size; k++) {
      let sum = 0;
      for (let n = 0; n < size; n++) {
        sum += matrix[y][n] * dct[k][n];
      }
      row.push(sum);
    }
    temp.push(row);
  }

  const result = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let n = 0; n < size; n++) {
        sum += temp[n][x] * dct[y][n];
      }
      row.push(sum);
    }
    result.push(row);
  }
  return result;
}

function binaryToHex(binary) {
  let hex = '';
  for (let i = 0; i < binary.length; i += 4) {
    hex += parseInt(binary.substr(i, 4), 2).toString(16);
  }
  return hex;
}

function computeHashFromImage(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  canvas.width = PHASH_DCT_SIZE;
  canvas.height = PHASH_DCT_SIZE;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, PHASH_DCT_SIZE, PHASH_DCT_SIZE);

  const imageData = ctx.getImageData(0, 0, PHASH_DCT_SIZE, PHASH_DCT_SIZE);
  const pixels = imageData.data;

  const grayscale = [];
  for (let y = 0; y < PHASH_DCT_SIZE; y++) {
    const row = [];
    for (let x = 0; x < PHASH_DCT_SIZE; x++) {
      const idx = (y * PHASH_DCT_SIZE + x) * 4;
      row.push(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
    }
    grayscale.push(row);
  }

  const dctResult = applyDCT2D(grayscale);

  const lowFreq = [];
  for (let y = 0; y < PHASH_HASH_SIZE; y++) {
    for (let x = 0; x < PHASH_HASH_SIZE; x++) {
      if (x === 0 && y === 0) continue;
      lowFreq.push(dctResult[y][x]);
    }
  }

  const sorted = [...lowFreq].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  let hash = '';
  for (let y = 0; y < PHASH_HASH_SIZE; y++) {
    for (let x = 0; x < PHASH_HASH_SIZE; x++) {
      hash += (x === 0 && y === 0) ? '0' : (dctResult[y][x] > median ? '1' : '0');
    }
  }

  return binaryToHex(hash);
}

function computePerceptualHashFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        resolve(computeHashFromImage(img));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
