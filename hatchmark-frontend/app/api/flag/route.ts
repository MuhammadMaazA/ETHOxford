import { NextResponse } from 'next/server';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ||
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';

// Minimum stake required to file a dispute (0.1 SUI in MIST)
const DISPUTE_STAKE_MIST = 100_000_000;

function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/^0x/, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }
  return bytes;
}

export async function POST(req: Request) {
  try {
    const { originalCertId, flaggedHash, similarityScore, hammingDistance } = await req.json();

    if (!originalCertId) {
      return NextResponse.json({ error: 'originalCertId required' }, { status: 400 });
    }
    if (!flaggedHash) {
      return NextResponse.json({ error: 'flaggedHash required' }, { status: 400 });
    }

    let score: number;
    if (typeof hammingDistance === 'number' && hammingDistance >= 0 && hammingDistance <= 255) {
      score = Math.round(hammingDistance);
    } else if (typeof similarityScore === 'number' && similarityScore >= 0 && similarityScore <= 100) {
      score = Math.round((100 - similarityScore) * 2.55);
    } else {
      return NextResponse.json({ error: 'hammingDistance or similarityScore required' }, { status: 400 });
    }

    const hashBytes = hexToBytes(flaggedHash);
    if (!hashBytes.length) {
      return NextResponse.json({ error: 'Invalid hash' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      packageId: PACKAGE_ID,
      stakeRequired: DISPUTE_STAKE_MIST,
      stakeDisplay: '0.1 SUI',
      inputs: { originalCertId, flaggedHash, score },
      instructions: 'Transaction must include a SUI coin split of 0.1 SUI as the stake argument'
    });
  } catch (err) {
    console.error('Flag error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    stakeRequired: DISPUTE_STAKE_MIST,
    stakeDisplay: '0.1 SUI'
  });
}
