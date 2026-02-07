/**
 * /api/register - Build an unsigned transaction for content registration
 * 
 * POST body: { 
 *   imageHash: string (hex),
 *   title: string,
 *   description: string
 * }
 * 
 * Returns: { transaction: string (base64 encoded) }
 */

import { Transaction } from '@mysten/sui/transactions';
import { NextResponse } from 'next/server';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUI_CLOCK = '0x6'; // Sui system Clock object

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex: string): number[] {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  return bytes;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageHash, title, description } = body;

    // Validate inputs
    if (!imageHash || typeof imageHash !== 'string') {
      return NextResponse.json(
        { error: 'imageHash is required and must be a hex string' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    // Convert hex hash to byte array
    const hashBytes = hexToBytes(imageHash);
    
    if (hashBytes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid hash format' },
        { status: 400 }
      );
    }

    // Build the transaction
    const tx = new Transaction();
    
    // Call hatchmark::registry::register
    tx.moveCall({
      target: `${PACKAGE_ID}::registry::register`,
      arguments: [
        tx.pure.vector('u8', hashBytes),           // image_hash: vector<u8>
        tx.pure.string(title),                      // title: String
        tx.pure.string(description || ''),          // description: String
        tx.object(SUI_CLOCK)                       // clock: &Clock
      ]
    });

    // Serialize the transaction for the frontend to sign
    // The frontend will use this with dapp-kit to execute
    const txData = tx.getData();

    return NextResponse.json({
      success: true,
      transactionData: {
        target: `${PACKAGE_ID}::registry::register`,
        arguments: {
          imageHash: hashBytes,
          title,
          description: description || ''
        }
      },
      packageId: PACKAGE_ID,
      function: 'register',
      inputs: {
        imageHash,
        title,
        description: description || ''
      },
      message: 'Transaction parameters ready. Build and sign with your wallet on the frontend.'
    });

  } catch (error) {
    console.error('Register transaction build error:', error);
    return NextResponse.json(
      { error: 'Failed to build transaction', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/register',
    method: 'POST',
    body: {
      imageHash: 'string (hex-encoded perceptual hash)',
      title: 'string (content title)',
      description: 'string (optional description)'
    },
    returns: {
      transaction: 'string (base64 encoded transaction to sign)'
    },
    description: 'Build an unsigned Sui transaction for content registration'
  });
}
