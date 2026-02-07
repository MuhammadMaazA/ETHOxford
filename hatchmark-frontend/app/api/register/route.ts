import { Transaction } from '@mysten/sui/transactions';
import { NextResponse } from 'next/server';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';

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
    const { imageHash, title, description } = await req.json();

    if (!imageHash || typeof imageHash !== 'string') {
      return NextResponse.json({ error: 'imageHash required' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }

    const hashBytes = hexToBytes(imageHash);
    if (!hashBytes.length) {
      return NextResponse.json({ error: 'Invalid hash' }, { status: 400 });
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::registry::register`,
      arguments: [
        tx.pure.vector('u8', hashBytes),
        tx.pure.string(title),
        tx.pure.string(description || ''),
        tx.object('0x6')
      ]
    });

    return NextResponse.json({
      success: true,
      packageId: PACKAGE_ID,
      inputs: { imageHash, title, description: description || '' }
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
