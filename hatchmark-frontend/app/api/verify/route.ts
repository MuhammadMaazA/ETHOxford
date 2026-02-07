/**
 * /api/verify - Verify an image hash against the registry
 * 
 * POST body: { hash: string }
 * Returns: { matches: Registration[], isOriginal: boolean }
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Compute Hamming distance between two hex strings
 * Returns number of differing bits
 * 
 * For perceptual hashes (16 hex chars = 64 bits):
 * - Distance 0 = identical
 * - Distance 1-6 = very similar (>90%)
 * - Distance 7-12 = similar (80-90%)
 * - Distance 13+ = different
 */
function hammingDistance(hash1: string, hash2: string): number {
  // Normalize to lowercase
  const h1 = hash1.toLowerCase();
  const h2 = hash2.toLowerCase();
  
  // If hash lengths are very different, they're incompatible hash types
  // (e.g., comparing 32-char MD5 to 16-char pHash)
  if (Math.abs(h1.length - h2.length) > 4) {
    // Return maximum distance to indicate no match
    return 64; // Max bits for pHash
  }
  
  // Pad shorter hash if needed
  const maxLen = Math.max(h1.length, h2.length);
  const padded1 = h1.padStart(maxLen, '0');
  const padded2 = h2.padStart(maxLen, '0');
  
  let distance = 0;
  for (let i = 0; i < maxLen; i++) {
    const byte1 = parseInt(padded1[i], 16);
    const byte2 = parseInt(padded2[i], 16);
    let xor = byte1 ^ byte2;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * Convert Hamming distance to similarity percentage
 * For perceptual hash (16-char hex = 64 bits):
 * - Distance 0 = 100% (identical)
 * - Distance 6 = 90.6% (similar)
 * - Distance 12 = 81.3% (somewhat similar)
 * - Distance 32 = 50% (half different)
 * - Distance 64 = 0% (completely different)
 */
function distanceToSimilarity(distance: number, hashLength: number): number {
  // For pHash, we use 64 bits as the max
  const maxBits = hashLength <= 16 ? 64 : hashLength * 4;
  const similarity = 1 - (distance / maxBits);
  return Math.round(similarity * 100);
}

interface Registration {
  cert_id: string;
  image_hash: string;
  creator: string;
  timestamp: number;
  title: string;
  description?: string;
  tx_digest?: string;
  created_at?: string;
}

interface MatchResult extends Registration {
  similarity: number;
  hammingDistance: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { hash } = body;

    if (!hash || typeof hash !== 'string') {
      return NextResponse.json(
        { error: 'Hash is required and must be a string' },
        { status: 400 }
      );
    }

    // Query all registrations from database
    const { data: registrations, error } = await supabase
      .from('registrations')
      .select('*');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({
        matches: [],
        isOriginal: true,
        message: 'No registrations found in database'
      });
    }

    // Compute similarity for each registration
    const matches: MatchResult[] = registrations
      .map((reg: Registration) => {
        const distance = hammingDistance(hash, reg.image_hash);
        const similarity = distanceToSimilarity(distance, Math.max(hash.length, reg.image_hash.length));
        
        return {
          ...reg,
          similarity,
          hammingDistance: distance
        };
      })
      .filter((reg: MatchResult) => reg.similarity >= 70) // 70% threshold for perceptual hash
      .sort((a: MatchResult, b: MatchResult) => b.similarity - a.similarity);

    // Check for exact match
    const exactMatch = matches.find(m => m.similarity === 100);
    
    return NextResponse.json({
      matches,
      isOriginal: matches.length === 0,
      exactMatch: exactMatch || null,
      totalRegistrations: registrations.length
    });

  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for simple testing
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/verify',
    method: 'POST',
    body: { hash: 'string (hex-encoded perceptual hash)' },
    description: 'Verify an image hash against registered content'
  });
}
