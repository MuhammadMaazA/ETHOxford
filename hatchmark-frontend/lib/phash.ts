const DCT_SIZE = 32;
const HASH_SIZE = 8;

let dctMatrix: number[][] | null = null;

function getDCTMatrix(): number[][] {
  if (dctMatrix) return dctMatrix;
  
  dctMatrix = [];
  for (let k = 0; k < DCT_SIZE; k++) {
    const row: number[] = [];
    for (let n = 0; n < DCT_SIZE; n++) {
      row.push(Math.cos((Math.PI / DCT_SIZE) * (n + 0.5) * k));
    }
    dctMatrix.push(row);
  }
  return dctMatrix;
}

function applyDCT2D(matrix: number[][]): number[][] {
  const dct = getDCTMatrix();
  const size = matrix.length;
  
  const temp: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let k = 0; k < size; k++) {
      let sum = 0;
      for (let n = 0; n < size; n++) {
        sum += matrix[y][n] * dct[k][n];
      }
      row.push(sum);
    }
    temp.push(row);
  }
  
  const result: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
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

function binaryToHex(binary: string): string {
  let hex = '';
  for (let i = 0; i < binary.length; i += 4) {
    hex += parseInt(binary.substr(i, 4), 2).toString(16);
  }
  return hex;
}

function calculateDCTHash(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  
  canvas.width = DCT_SIZE;
  canvas.height = DCT_SIZE;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, DCT_SIZE, DCT_SIZE);
  
  const imageData = ctx.getImageData(0, 0, DCT_SIZE, DCT_SIZE);
  const pixels = imageData.data;
  
  const grayscale: number[][] = [];
  for (let y = 0; y < DCT_SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < DCT_SIZE; x++) {
      const idx = (y * DCT_SIZE + x) * 4;
      row.push(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
    }
    grayscale.push(row);
  }
  
  const dctResult = applyDCT2D(grayscale);
  
  const lowFreq: number[] = [];
  for (let y = 0; y < HASH_SIZE; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      if (x === 0 && y === 0) continue;
      lowFreq.push(dctResult[y][x]);
    }
  }
  
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  let hash = '';
  for (let y = 0; y < HASH_SIZE; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      hash += (x === 0 && y === 0) ? '0' : (dctResult[y][x] > median ? '1' : '0');
    }
  }
  
  return binaryToHex(hash);
}

export async function computePerceptualHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        resolve(calculateDCTHash(img));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    const maxLen = Math.max(hash1.length, hash2.length);
    hash1 = hash1.padStart(maxLen, '0');
    hash2 = hash2.padStart(maxLen, '0');
  }
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    let xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}
