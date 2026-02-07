/**
 * Perceptual Hash (dHash) Implementation
 * 
 * Uses difference hash algorithm:
 * 1. Resize to 9x8 grayscale
 * 2. Compare adjacent horizontal pixels
 * 3. Generate 64-bit fingerprint
 * 
 * Similar images produce similar hashes even after:
 * - Screenshots, cropping, resizing
 * - JPEG compression
 * - Color adjustments
 */

/**
 * Compute perceptual hash of an image file
 * Returns 16-character hex string (64 bits)
 */
export async function computePerceptualHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const hash = calculateDHash(img);
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
 * Calculate dHash (difference hash) from an image
 */
function calculateDHash(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas not supported');
  }
  
  // Resize to 9x8 (we need 9 pixels wide to compare 8 pairs)
  const width = 9;
  const height = 8;
  canvas.width = width;
  canvas.height = height;
  
  // Draw resized grayscale image
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  
  // Convert to grayscale values
  const grayscale: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Luminance formula: 0.299R + 0.587G + 0.114B
      const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      row.push(gray);
    }
    grayscale.push(row);
  }
  
  // Compute difference hash
  // Compare each pixel to its right neighbor
  // If left > right, bit = 1, else bit = 0
  let hash = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const bit = grayscale[y][x] > grayscale[y][x + 1] ? '1' : '0';
      hash += bit;
    }
  }
  
  // Convert 64-bit binary string to 16-char hex
  return binaryToHex(hash);
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
