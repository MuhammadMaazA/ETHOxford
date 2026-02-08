import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _supabase;
}

function hammingDistance(hash1: string, hash2: string): number {
  const h1 = hash1.toLowerCase();
  const h2 = hash2.toLowerCase();
  
  if (Math.abs(h1.length - h2.length) > 4) return 64;
  
  const maxLen = Math.max(h1.length, h2.length);
  const padded1 = h1.padStart(maxLen, '0');
  const padded2 = h2.padStart(maxLen, '0');
  
  let distance = 0;
  for (let i = 0; i < maxLen; i++) {
    let xor = parseInt(padded1[i], 16) ^ parseInt(padded2[i], 16);
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

function toSimilarity(distance: number, hashLen: number): number {
  const maxBits = hashLen <= 16 ? 64 : hashLen * 4;
  return Math.round((1 - distance / maxBits) * 100);
}

interface Registration {
  cert_id: string;
  image_hash: string;
  creator: string;
  timestamp: number;
  title: string;
  description?: string;
  tx_digest?: string;
}

interface Match extends Registration {
  similarity: number;
  hammingDistance: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { hash } = await req.json();

    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Hash required' }, { status: 400, headers: corsHeaders });
    }

    const { data: registrations, error } = await getSupabase()
      .from('registrations')
      .select('*');

    if (error) {
      console.error('DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500, headers: corsHeaders });
    }

    if (!registrations?.length) {
      return NextResponse.json({ matches: [], isOriginal: true }, { headers: corsHeaders });
    }

    const matches: Match[] = registrations
      .map((reg: Registration) => {
        const dist = hammingDistance(hash, reg.image_hash);
        const similarity = toSimilarity(dist, Math.max(hash.length, reg.image_hash.length));
        return { ...reg, similarity, hammingDistance: dist };
      })
      .filter((m: Match) => m.similarity >= 70)
      .sort((a: Match, b: Match) => b.similarity - a.similarity);

    return NextResponse.json({
      matches,
      isOriginal: matches.length === 0,
      exactMatch: matches.find(m => m.similarity === 100) || null,
      totalRegistrations: registrations.length
    }, { headers: corsHeaders });
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
