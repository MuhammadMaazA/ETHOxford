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
 */
function hammingDistance(hash1: string, hash2: string): number {
  // Normalize to lowercase and same length
  const h1 = hash1.toLowerCase();
  const h2 = hash2.toLowerCase();
  
  if (h1.length !== h2.length) {
    // If lengths differ, compare character by character up to shorter length
    // and count remaining as differences
    const minLen = Math.min(h1.length, h2.length);
    let distance = Math.abs(h1.length - h2.length) * 4; // Each hex char = 4 bits
    
    for (let i = 0; i < minLen; i++) {
      const byte1 = parseInt(h1[i], 16);
      const byte2 = parseInt(h2[i], 16);
      // Count differing bits using XOR and popcount
      let xor = byte1 ^ byte2;
      while (xor) {
        distance += xor & 1;
        xor >>= 1;
      }
    }
    return distance;
  }
  
  let distance = 0;
  for (let i = 0; i < h1.length; i++) {
    const byte1 = parseInt(h1[i], 16);
    const byte2 = parseInt(h2[i], 16);
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
 * For a 64-char hex hash (256 bits), max distance is 256
 */
function distanceToSimilarity(distance: number, hashLength: number): number {
  const maxBits = hashLength * 4; // Each hex char = 4 bits
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
      .filter((reg: MatchResult) => reg.similarity >= 90) // 90% threshold
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
