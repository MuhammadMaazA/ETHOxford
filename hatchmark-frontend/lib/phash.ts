/**
 * DCT-based Perceptual Hash (pHash) Implementation
 * 
 * Uses Discrete Cosine Transform for robust image fingerprinting:
 * 1. Resize image to 32x32 grayscale
 * 2. Apply 2D DCT (Discrete Cosine Transform)
 * 3. Extract top-left 8x8 block (low-frequency components)
 * 4. Generate hash by comparing to median
 * 
 * DCT-based pHash is highly robust against:
 * - Screenshots (gamma changes, anti-aliasing)
 * - JPEG compression (up to 75%)
 * - Slight color adjustments
 * - Minor cropping and resizing
 */

/**
 * Compute DCT-based perceptual hash of an image file
 * Returns 16-character hex string (64 bits)
 */
export async function computePerceptualHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const hash = calculateDCTHash(img);
        resolve(hash);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Pre-computed DCT coefficients for 32x32 -> 8x8
 * c[k] = cos((2n+1) * k * PI / 64) for n,k in [0,31]
 */
const DCT_SIZE = 32;
const HASH_SIZE = 8;

// Precompute DCT matrix for efficiency
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

/**
 * Calculate DCT-based pHash from an image
 */
function calculateDCTHash(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas not supported');
  }
  
  // Resize to 32x32 for DCT
  canvas.width = DCT_SIZE;
  canvas.height = DCT_SIZE;
  
  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(img, 0, 0, DCT_SIZE, DCT_SIZE);
  const imageData = ctx.getImageData(0, 0, DCT_SIZE, DCT_SIZE);
  const pixels = imageData.data;
  
  // Convert to grayscale matrix
  const grayscale: number[][] = [];
  for (let y = 0; y < DCT_SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < DCT_SIZE; x++) {
      const idx = (y * DCT_SIZE + x) * 4;
      // Luminance formula: 0.299R + 0.587G + 0.114B
      const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      row.push(gray);
    }
    grayscale.push(row);
  }
  
  // Apply 2D DCT
  const dctResult = applyDCT2D(grayscale);
  
  // Extract top-left 8x8 block (low-frequency components)
  // Skip [0][0] as it's the DC component (average brightness)
  const lowFreq: number[] = [];
  for (let y = 0; y < HASH_SIZE; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      if (x === 0 && y === 0) continue; // Skip DC
      lowFreq.push(dctResult[y][x]);
    }
  }
  
  // Calculate median of low-frequency values
  const sorted = [...lowFreq].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Generate hash: 1 if value > median, else 0
  let hash = '';
  for (let y = 0; y < HASH_SIZE; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      if (x === 0 && y === 0) {
        hash += '0'; // DC component always 0
      } else {
        hash += dctResult[y][x] > median ? '1' : '0';
      }
    }
  }
  
  // Convert 64-bit binary string to 16-char hex
  return binaryToHex(hash);
}

/**
 * Apply 2D DCT (Discrete Cosine Transform)
 * First apply 1D DCT to rows, then to columns
 */
function applyDCT2D(matrix: number[][]): number[][] {
  const dct = getDCTMatrix();
  const size = matrix.length;
  
  // Apply DCT to rows
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
  
  // Apply DCT to columns
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

/**
 * Convert binary string to hex
 */
function binaryToHex(binary: string): string {
  let hex = '';
  for (let i = 0; i < binary.length; i += 4) {
    const chunk = binary.substr(i, 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex;
}

/**
 * Calculate Hamming distance between two hex hashes
 * Returns number of differing bits (0-64)
 * Lower = more similar
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    // Pad shorter hash or handle length mismatch
    const maxLen = Math.max(hash1.length, hash2.length);
    hash1 = hash1.padStart(maxLen, '0');
    hash2 = hash2.padStart(maxLen, '0');
  }
  
  let distance = 0;
  
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    const xor = n1 ^ n2;
    
    // Count set bits in XOR result
    distance += countBits(xor);
  }
  
  return distance;
}

/**
 * Count number of 1 bits in a number
 */
function countBits(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

/**
 * Calculate similarity percentage from Hamming distance
 * For 64-bit hash: distance 0 = 100%, distance 64 = 0%
 */
export function similarityFromDistance(distance: number, hashBits: number = 64): number {
  const similarity = ((hashBits - distance) / hashBits) * 100;
  return Math.max(0, Math.min(100, similarity));
}

/**
 * Check if two hashes are similar (above threshold)
 * Default threshold: 90% similarity (≤6 bits different for 64-bit hash)
 */
export function isSimilar(hash1: string, hash2: string, threshold: number = 90): boolean {
  const distance = hammingDistance(hash1, hash2);
  const similarity = similarityFromDistance(distance);
  return similarity >= threshold;
}
